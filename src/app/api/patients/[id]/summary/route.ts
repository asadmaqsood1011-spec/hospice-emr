import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ageFrom } from "@/lib/utils";
import { getOpenAI } from "@/lib/openai";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { requirePatientAccess } from "@/lib/patient-access";

const RATE_MAX = 20; // per user per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`summary:${session.user.id}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(rl, RATE_MAX) }
    );
  }

  const { id } = await params;
  const access = await requirePatientAccess(session, id, "patient.read");
  if (!access.ok) return access.response;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      meds: { where: { discontinuedAt: null } },
      esasScores: { orderBy: { recordedAt: "desc" }, take: 3 },
      ppsScores: { orderBy: { recordedAt: "desc" }, take: 3 },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 5 },
      allergies: true,
    },
  });
  if (!patient || patient.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // De-identify before sending to OpenAI: drop name, DOB, address; use age + sex + dx only.
  const context = [
    `Patient: ${ageFrom(patient.dob)}y ${patient.sex ?? ""}.`,
    `Primary dx: ${patient.primaryDx ?? "unknown"}${patient.primaryDxIcd ? ` (${patient.primaryDxIcd})` : ""}.`,
    `Code status: ${patient.codeStatus}. Level of care: ${patient.levelOfCare}.`,
    `Allergies: ${patient.allergies.length === 0 ? "NKDA" : patient.allergies.map((a) => a.substance).join(", ")}.`,
    `Active meds: ${patient.meds.map((m) => `${m.name} ${m.dose}${m.frequency ? " " + m.frequency : ""}`).join("; ") || "none"}.`,
    `Recent PPS: ${patient.ppsScores.map((p) => p.score).join(", ") || "no scores"}.`,
    `Recent ESAS pain: ${patient.esasScores.map((s) => s.pain).join(", ") || "no scores"}.`,
    "",
    "Recent notes (de-identified):",
    ...patient.clinicalNotes.map((n) => `- ${n.assessment ?? ""} | Plan: ${n.plan ?? ""}`),
  ].join("\n");

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a hospice clinical scribe. Produce a single concise paragraph (4-6 sentences) summarizing the patient for a handoff between providers. Refer to the patient as 'the patient' (no names provided). Cover: dx + prognosis trajectory, current symptom burden, key meds + recent changes, code/care goals. Plain clinical language. No bullet lists.",
        },
        { role: "user", content: context },
      ],
    });

    const summary = completion.choices[0].message.content ?? "";

    await audit({
      userId: session.user.id,
      patientId: id,
      action: "READ",
      resource: "PatientSummary",
      resourceId: id,
      metadata: { aiModel: "gpt-4o", ...(access.viaBreakGlass ? { viaBreakGlass: true } : {}) },
    });

    return NextResponse.json({ summary }, { headers: rateLimitHeaders(rl, RATE_MAX) });
  } catch (err) {
    logger.error({ route: "summary", err: (err as Error).message }, "OpenAI summary failed");
    return NextResponse.json({ error: "Upstream AI service failed" }, { status: 502 });
  }
}
