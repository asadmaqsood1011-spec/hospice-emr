"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import type { CodeStatus, LevelOfCare } from "@/generated/prisma";

const Schema = z.object({
  mrn: z.string().min(2).max(40),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(8), // YYYY-MM-DD
  sex: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  primaryDx: z.string().optional(),
  primaryDxIcd: z.string().optional(),
  codeStatus: z.enum(["FULL", "DNR", "DNI", "DNR_DNI", "COMFORT_ONLY"]),
  levelOfCare: z.enum(["ROUTINE", "CONTINUOUS", "INPATIENT_RESPITE", "GENERAL_INPATIENT"]),
  prognosisMo: z.string().optional(),
  consentOnFile: z.string().optional(),
  caregiverName: z.string().optional(),
  caregiverRelationship: z.string().optional(),
  caregiverPhone: z.string().optional(),
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

  const existing = await prisma.patient.findUnique({ where: { mrn: d.mrn } });
  if (existing) return { error: `MRN ${d.mrn} already exists` };

  const patient = await prisma.patient.create({
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
