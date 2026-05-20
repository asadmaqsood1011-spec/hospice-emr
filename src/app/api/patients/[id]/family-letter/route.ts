import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { getOpenAI } from "@/lib/openai";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const RATE_MAX = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`family-letter:${session.user.id}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(rl, RATE_MAX) }
    );
  }

  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      contacts: { where: { isPrimary: true } },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 3 },
      esasScores: { orderBy: { recordedAt: "desc" }, take: 1 },
      ppsScores: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });
  if (!patient || patient.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const primary = patient.contacts[0];
  // De-identify recent notes: drop dates, send assessment + plan text only.
  const recent = patient.clinicalNotes
    .map((n) => `- ${n.assessment ?? ""} ${n.plan ?? ""}`)
    .join("\n");

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You write warm, plain-language status letters from a hospice care team to a patient's primary caregiver. Use grade 8 reading level. Avoid jargon (no 'PPS', 'ESAS', 'ICD-10', etc). Convey: how the patient is doing this week, what the team did, what to expect, who to call. 3-4 short paragraphs. Open with a warm address. Close with care team's contact line. Never make promises about prognosis. Refer to the patient by first name only (provided).",
        },
        {
          role: "user",
          content: [
            `Patient first name: ${patient.firstName}.`,
            `Caregiver to address: ${primary?.name ?? "the family"}${primary?.relationship ? ` (${primary.relationship})` : ""}.`,
            `Diagnosis: ${patient.primaryDx ?? "—"}.`,
            recent ? `Recent care (de-identified):\n${recent}` : "",
          ].join("\n"),
        },
      ],
    });

    const letter = completion.choices[0].message.content ?? "";

    await audit({
      userId: session.user.id,
      patientId: id,
      action: "READ",
      resource: "FamilyLetter",
      resourceId: id,
      metadata: { aiModel: "gpt-4o" },
    });

    return NextResponse.json({ letter }, { headers: rateLimitHeaders(rl, RATE_MAX) });
  } catch (err) {
    logger.error({ route: "family-letter", err: (err as Error).message }, "OpenAI family-letter failed");
    return NextResponse.json({ error: "Upstream AI service failed" }, { status: 502 });
  }
}
