import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma";
import { requirePatientAccess } from "@/lib/patient-access";

const Body = z.object({
  patientId: z.string(),
  visitId: z.string().optional(),
  visitType: z
    .enum([
      "RN_VISIT",
      "MD_VISIT",
      "SW_VISIT",
      "CHAPLAIN_VISIT",
      "AIDE_VISIT",
      "VOLUNTEER_VISIT",
      "IDG_MEETING",
      "PHONE",
    ])
    .optional(),
  visitDurationMin: z.number().int().positive().optional(),
  visitStartedAt: z.string().optional(),
  transcript: z.string().optional(),
  transcriptOriginal: z.string().optional(),
  language: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  esas: z
    .object({
      pain: z.number().nullable().optional(),
      tiredness: z.number().nullable().optional(),
      drowsiness: z.number().nullable().optional(),
      nausea: z.number().nullable().optional(),
      appetite: z.number().nullable().optional(),
      shortBreath: z.number().nullable().optional(),
      depression: z.number().nullable().optional(),
      anxiety: z.number().nullable().optional(),
      wellbeing: z.number().nullable().optional(),
    })
    .optional(),
  pps: z.number().nullable().optional(),
  medChanges: z.array(z.string()).optional(),
  icd10: z
    .array(z.union([z.string(), z.object({ code: z.string(), confidence: z.number().optional() })]))
    .optional(),
  confidence: z.number().optional(),
  sign: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  if (!can(session.user.role, "note.create")) {
    return NextResponse.json({ error: "Not allowed to create notes" }, { status: 403 });
  }

  if (d.sign && !can(session.user.role, "note.sign")) {
    return NextResponse.json({ error: "Not allowed to sign" }, { status: 403 });
  }

  const access = await requirePatientAccess(session, d.patientId, "note.create");
  if (!access.ok) return access.response;

  const endedAt = new Date();
  const startedAt = d.visitStartedAt ? new Date(d.visitStartedAt) : endedAt;

  let note;
  try {
    note = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id: d.patientId },
        select: { id: true, deletedAt: true },
      });
      if (!patient || patient.deletedAt) {
        throw new NoteWriteError("Patient not found", 404);
      }

      const visit = d.visitId
        ? await updateOwnedVisit(tx, d.visitId, d.patientId, session.user.id, {
            endedAt,
            durationMin: d.visitDurationMin,
            signed: d.sign,
            signedAt: d.sign ? endedAt : null,
          })
        : await tx.visit.create({
            data: {
              patientId: d.patientId,
              providerId: session.user.id,
              type: d.visitType ?? roleDefaultVisitType(session.user.role),
              startedAt,
              endedAt,
              durationMin: d.visitDurationMin,
              signed: d.sign,
              signedAt: d.sign ? endedAt : null,
            },
          });

      return tx.note.create({
        data: {
          visitId: visit.id,
          patientId: d.patientId,
          authorId: session.user.id,
          transcript: d.transcript,
          transcriptOrig: d.transcriptOriginal,
          language: d.language,
          subjective: d.subjective,
          objective: d.objective,
          assessment: d.assessment,
          plan: d.plan,
          icd10Codes: d.icd10,
          aiDraft: {
            esas: d.esas,
            pps: d.pps,
            medChanges: d.medChanges,
            icd10: d.icd10,
            confidence: d.confidence,
          },
          aiModel: "gpt-4o",
          aiConfidence: d.confidence,
          signed: d.sign,
          signedAt: d.sign ? endedAt : null,
        },
      });
    });
  } catch (err) {
    if (err instanceof NoteWriteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Persist extracted ESAS if any values present
  if (d.esas && Object.values(d.esas).some((v) => v !== null && v !== undefined)) {
    await prisma.eSAS.create({
      data: {
        patientId: d.patientId,
        pain: d.esas.pain ?? 0,
        tiredness: d.esas.tiredness ?? 0,
        drowsiness: d.esas.drowsiness ?? 0,
        nausea: d.esas.nausea ?? 0,
        appetite: d.esas.appetite ?? 0,
        shortBreath: d.esas.shortBreath ?? 0,
        depression: d.esas.depression ?? 0,
        anxiety: d.esas.anxiety ?? 0,
        wellbeing: d.esas.wellbeing ?? 0,
        recordedById: session.user.id,
      },
    });
  }

  if (d.pps !== null && d.pps !== undefined) {
    await prisma.pPS.create({
      data: {
        patientId: d.patientId,
        score: d.pps,
        recordedById: session.user.id,
      },
    });
  }

  await audit({
    userId: session.user.id,
    patientId: d.patientId,
    action: "CREATE",
    resource: "Note",
    resourceId: note.id,
    metadata: { signed: d.sign, aiModel: "gpt-4o", visitDurationMin: d.visitDurationMin },
  });

  return NextResponse.json({ id: note.id, signed: d.sign });
}

class NoteWriteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function updateOwnedVisit(
  tx: Prisma.TransactionClient,
  visitId: string,
  patientId: string,
  userId: string,
  data: {
    endedAt: Date;
    durationMin?: number;
    signed: boolean;
    signedAt: Date | null;
  }
) {
  const visit = await tx.visit.findUnique({
    where: { id: visitId },
    select: { id: true, patientId: true, providerId: true },
  });
  if (!visit || visit.patientId !== patientId) {
    throw new NoteWriteError("Visit not found", 404);
  }
  if (visit.providerId !== userId) {
    throw new NoteWriteError("Visit belongs to another provider", 403);
  }
  return tx.visit.update({ where: { id: visitId }, data });
}

function roleDefaultVisitType(role: string) {
  if (role === "MD") return "MD_VISIT";
  if (role === "SW") return "SW_VISIT";
  if (role === "CHAPLAIN") return "CHAPLAIN_VISIT";
  if (role === "AIDE") return "AIDE_VISIT";
  if (role === "VOLUNTEER") return "VOLUNTEER_VISIT";
  return "RN_VISIT";
}
