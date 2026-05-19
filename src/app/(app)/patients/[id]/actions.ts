"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

const PatientId = z.string().min(1);

export async function addCaregiver(formData: FormData) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "patient.update")) return;

  const patientId = PatientId.parse(formData.get("patientId"));
  const name = z.string().min(1).parse(String(formData.get("name") ?? "").trim());
  const relationship = optional(formData.get("relationship"));
  const phone = optional(formData.get("phone"));
  const isPrimary = formData.get("isPrimary") === "on";

  if (isPrimary) {
    await prisma.caregiver.updateMany({ where: { patientId }, data: { isPrimary: false } });
  }

  const caregiver = await prisma.caregiver.create({
    data: { patientId, name, relationship, phone, isPrimary },
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "Caregiver",
    resourceId: caregiver.id,
  });

  redirect(`/patients/${patientId}`);
}

export async function addAllergy(formData: FormData) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "patient.update")) return;

  const patientId = PatientId.parse(formData.get("patientId"));
  const substance = z.string().min(1).parse(String(formData.get("substance") ?? "").trim());
  const reaction = optional(formData.get("reaction"));
  const severity = optional(formData.get("severity"));

  const allergy = await prisma.allergy.create({
    data: { patientId, substance, reaction, severity },
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "Allergy",
    resourceId: allergy.id,
  });

  redirect(`/patients/${patientId}`);
}

export async function addScores(formData: FormData) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "patient.update")) return;

  const patientId = PatientId.parse(formData.get("patientId"));
  const pps = numberOrNull(formData.get("pps"));
  const esas = {
    pain: numberOrNull(formData.get("pain")) ?? 0,
    tiredness: numberOrNull(formData.get("tiredness")) ?? 0,
    drowsiness: numberOrNull(formData.get("drowsiness")) ?? 0,
    nausea: numberOrNull(formData.get("nausea")) ?? 0,
    appetite: numberOrNull(formData.get("appetite")) ?? 0,
    shortBreath: numberOrNull(formData.get("shortBreath")) ?? 0,
    depression: numberOrNull(formData.get("depression")) ?? 0,
    anxiety: numberOrNull(formData.get("anxiety")) ?? 0,
    wellbeing: numberOrNull(formData.get("wellbeing")) ?? 0,
  };

  if (pps !== null) {
    await prisma.pPS.create({
      data: { patientId, score: clamp(pps, 0, 100), recordedById: session.user.id },
    });
  }

  await prisma.eSAS.create({
    data: {
      patientId,
      ...mapValues(esas, (n) => clamp(n, 0, 10)),
      recordedById: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "ClinicalScores",
    resourceId: patientId,
    metadata: { pps, esas },
  });

  redirect(`/patients/${patientId}`);
}

export async function addMedication(formData: FormData) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "med.prescribe")) return;

  const patientId = PatientId.parse(formData.get("patientId"));
  const name = z.string().min(1).parse(String(formData.get("name") ?? "").trim());
  const dose = z.string().min(1).parse(String(formData.get("dose") ?? "").trim());
  const medication = await prisma.medication.create({
    data: {
      patientId,
      name,
      rxcui: optional(formData.get("rxcui")),
      dose,
      route: optional(formData.get("route")),
      frequency: optional(formData.get("frequency")),
      indication: optional(formData.get("indication")),
      controlled: formData.get("controlled") === "on",
      prescriberId: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "Medication",
    resourceId: medication.id,
  });

  redirect(`/patients/${patientId}`);
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapValues<T extends Record<string, number>>(obj: T, fn: (value: number) => number): T {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)])) as T;
}
