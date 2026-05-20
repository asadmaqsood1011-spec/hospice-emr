"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import type { CodeStatus, LevelOfCare } from "@/generated/prisma";

const PHONE_RE = /^[\d\s+()-]{7,20}$/;

const Schema = z.object({
  mrn: z.string().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, "MRN must be alphanumeric (dashes allowed)"),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dob: z
    .string()
    .min(8)
    .refine((s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime()) && d <= new Date() && d > new Date("1900-01-01");
    }, "DOB must be a real date between 1900 and today"),
  sex: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_RE.test(v), "Phone format invalid"),
  address: z.string().optional(),
  primaryDx: z.string().optional(),
  primaryDxIcd: z.string().optional(),
  codeStatus: z.enum(["FULL", "DNR", "DNI", "DNR_DNI", "COMFORT_ONLY"]),
  levelOfCare: z.enum(["ROUTINE", "CONTINUOUS", "INPATIENT_RESPITE", "GENERAL_INPATIENT"]),
  prognosisMo: z.string().optional(),
  consentOnFile: z.string().optional(),
  caregiverName: z.string().optional(),
  caregiverRelationship: z.string().optional(),
  caregiverPhone: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_RE.test(v), "Caregiver phone format invalid"),
});

export type AdmitState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function admitPatient(_prev: AdmitState, formData: FormData): Promise<AdmitState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!can(session.user.role, "patient.create")) {
    return { error: "Your role cannot admit patients" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;

  let patient;
  try {
    patient = await prisma.patient.create({
      data: {
        mrn: d.mrn,
        firstName: d.firstName,
        lastName: d.lastName,
        dob: new Date(d.dob),
        sex: d.sex || null,
        phone: d.phone || null,
        address: d.address || null,
        primaryDx: d.primaryDx || null,
        primaryDxIcd: d.primaryDxIcd || null,
        codeStatus: d.codeStatus as CodeStatus,
        levelOfCare: d.levelOfCare as LevelOfCare,
        prognosisMo: d.prognosisMo ? Number(d.prognosisMo) : null,
        consentOnFile: d.consentOnFile === "on",
        contacts: d.caregiverName
          ? {
              create: [
                {
                  name: d.caregiverName,
                  relationship: d.caregiverRelationship || null,
                  phone: d.caregiverPhone || null,
                  isPrimary: true,
                },
              ],
            }
          : undefined,
      },
    });
  } catch (err) {
    // Prisma unique-constraint error code is P2002
    if ((err as { code?: string }).code === "P2002") {
      return { error: `MRN ${d.mrn} already exists` };
    }
    throw err;
  }

  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "CREATE",
    resource: "Patient",
    resourceId: patient.id,
    metadata: { mrn: d.mrn },
  });

  redirect(`/patients/${patient.id}`);
}
