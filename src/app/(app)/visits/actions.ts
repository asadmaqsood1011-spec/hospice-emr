"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import type { VisitType } from "@/generated/prisma";

const VisitTypeSchema = z.enum([
  "RN_VISIT",
  "MD_VISIT",
  "SW_VISIT",
  "CHAPLAIN_VISIT",
  "AIDE_VISIT",
  "VOLUNTEER_VISIT",
  "IDG_MEETING",
  "PHONE",
]);

export async function scheduleVisit(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const patientId = z.string().min(1).parse(formData.get("patientId"));
  const type = VisitTypeSchema.parse(formData.get("type")) as VisitType;
  const scheduledRaw = z.string().min(1).parse(formData.get("scheduledFor"));
  const scheduledFor = new Date(scheduledRaw);
  const location = optional(formData.get("location"));

  const visit = await prisma.visit.create({
    data: {
      patientId,
      providerId: session.user.id,
      type,
      scheduledFor,
      startedAt: scheduledFor,
      location,
    },
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "Visit",
    resourceId: visit.id,
    metadata: { event: "scheduled", type },
  });

  redirect("/visits?days=30");
}

export async function startVisit(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const visitId = z.string().min(1).parse(formData.get("visitId"));
  const visit = await prisma.visit.update({
    where: { id: visitId },
    data: { startedAt: new Date(), endedAt: null, durationMin: null },
    select: { id: true, patientId: true },
  });

  await audit({
    userId: session.user.id,
    patientId: visit.patientId,
    action: "UPDATE",
    resource: "Visit",
    resourceId: visit.id,
    metadata: { event: "started" },
  });

  redirect(`/patients/${visit.patientId}#voice-recorder`);
}

export async function endVisit(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const visitId = z.string().min(1).parse(formData.get("visitId"));
  const current = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, patientId: true, startedAt: true },
  });
  if (!current) return;

  const endedAt = new Date();
  const durationMin = Math.max(1, Math.round((endedAt.getTime() - current.startedAt.getTime()) / 60000));

  await prisma.visit.update({
    where: { id: visitId },
    data: { endedAt, durationMin },
  });

  await audit({
    userId: session.user.id,
    patientId: current.patientId,
    action: "UPDATE",
    resource: "Visit",
    resourceId: current.id,
    metadata: { event: "ended", durationMin },
  });

  redirect("/visits");
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
