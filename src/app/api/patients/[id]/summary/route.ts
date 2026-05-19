import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ageFrom } from "@/lib/utils";
import { getOpenAI } from "@/lib/openai";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const context = [
    `Patient: ${patient.firstName} ${patient.lastName}, ${ageFrom(patient.dob)}y ${patient.sex ?? ""}.`,
    `Primary dx: ${patient.primaryDx ?? "unknown"}${patient.primaryDxIcd ? ` (${patient.primaryDxIcd})` : ""}.`,
    `Code status: ${patient.codeStatus}. Level of care: ${patient.levelOfCare}.`,
    `Allergies: ${patient.allergies.length === 0 ? "NKDA" : patient.allergies.map((a) => a.substance).join(", ")}.`,
    `Active meds: ${patient.meds.map((m) => `${m.name} ${m.dose}${m.frequency ? " " + m.frequency : ""}`).join("; ") || "none"}.`,
    `Recent PPS: ${patient.ppsScores.map((p) => p.score).join(", ") || "no scores"}.`,
    `Recent ESAS pain: ${patient.esasScores.map((s) => s.pain).join(", ") || "no scores"}.`,
    "",
    "Recent notes:",
    ...patient.clinicalNotes.map((n) => `- ${n.createdAt.toISOString().slice(0, 10)}: ${n.assessment ?? ""} | Plan: ${n.plan ?? ""}`),
  ].join("\n");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a hospice clinical scribe. Produce a single concise paragraph (4-6 sentences) summarizing the patient for a handoff between providers. Cover: dx + prognosis trajectory, current symptom burden, key meds + recent changes, code/care goals, family/social if mentioned. Plain clinical language. No bullet lists.",
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
    metadata: { aiModel: "gpt-4o" },
  });

  return NextResponse.json({ summary });
}
