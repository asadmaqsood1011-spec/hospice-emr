"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

const PHONE_RE = /^[\d\s+()-]{7,20}$/;

const ReferralSchema = z.object({
  source: z.string().max(120).optional(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dob: z.string().optional(),
  phone: z.string().optional().refine((v) => !v || PHONE_RE.test(v), "Phone format invalid"),
  primaryDx: z.string().max(160).optional(),
  primaryDxIcd: z.string().max(20).optional(),
  payer: z.string().max(120).optional(),
  caregiverName: z.string().max(120).optional(),
  caregiverPhone: z.string().optional().refine((v) => !v || PHONE_RE.test(v), "Caregiver phone format invalid"),
  hospiceEligible: z.string().optional(),
  consentReady: z.string().optional(),
  documentsReady: z.string().optional(),
  notes: z.string().max(1200).optional(),
});

const ConvertSchema = z.object({
  referralId: z.string().min(1),
  mrn: z.string().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, "MRN must be alphanumeric (dashes allowed)"),
  codeStatus: z.enum(["FULL", "DNR", "DNI", "DNR_DNI", "COMFORT_ONLY"]),
  levelOfCare: z.enum(["ROUTINE", "CONTINUOUS", "INPATIENT_RESPITE", "GENERAL_INPATIENT"]),
});

export type ReferralFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createReferral(_prev: ReferralFormState, formData: FormData): Promise<ReferralFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!can(session.user.role, "patient.create")) return { error: "Your role cannot create referrals" };

  const parsed = ReferralSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;
  const ready = Boolean(d.hospiceEligible && d.consentReady && d.documentsReady);
  const referral = await prisma.referral.create({
    data: {
      source: d.source || null,
      firstName: d.firstName,
      lastName: d.lastName,
      dob: d.dob ? new Date(d.dob) : null,
      phone: d.phone || null,
      primaryDx: d.primaryDx || null,
      primaryDxIcd: d.primaryDxIcd || null,
      payer: d.payer || null,
      caregiverName: d.caregiverName || null,
      caregiverPhone: d.caregiverPhone || null,
      hospiceEligible: Boolean(d.hospiceEligible),
      consentReady: Boolean(d.consentReady),
      documentsReady: Boolean(d.documentsReady),
      status: ready ? "READY_TO_ADMIT" : "NEEDS_INFO",
      notes: d.notes || null,
      createdBy: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    action: "CREATE",
    resource: "Referral",
    resourceId: referral.id,
    metadata: { status: referral.status, source: referral.source },
  });

  revalidatePath("/referrals");
  return undefined;
}

export async function convertReferralToPatient(_prev: ReferralFormState, formData: FormData): Promise<ReferralFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!can(session.user.role, "patient.create")) return { error: "Your role cannot admit patients" };

  const parsed = ConvertSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;
  const referral = await prisma.referral.findUnique({ where: { id: d.referralId } });
  if (!referral || referral.status === "ADMITTED") return { error: "Referral not available" };
  if (!referral.dob) return { error: "DOB required before admission" };
  if (!referral.hospiceEligible || !referral.consentReady || !referral.documentsReady) {
    return { error: "Referral must be hospice eligible, consent-ready, and document-ready" };
  }

  let patient;
  try {
    patient = await prisma.patient.create({
      data: {
        mrn: d.mrn,
        firstName: referral.firstName,
        lastName: referral.lastName,
        dob: referral.dob,
        phone: referral.phone,
        primaryDx: referral.primaryDx,
        primaryDxIcd: referral.primaryDxIcd,
        codeStatus: d.codeStatus,
        levelOfCare: d.levelOfCare,
        prognosisMo: 6,
        consentOnFile: referral.consentReady,
        contacts: referral.caregiverName
          ? {
              create: [{
                name: referral.caregiverName,
                relationship: "Caregiver",
                phone: referral.caregiverPhone,
                isPrimary: true,
              }],
            }
          : undefined,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return { error: `MRN ${d.mrn} already exists` };
    throw err;
  }

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "ADMITTED", convertedPatientId: patient.id },
  });

  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "CREATE",
    resource: "Patient",
    resourceId: patient.id,
    metadata: { fromReferralId: referral.id, mrn: d.mrn },
  });
  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "UPDATE",
    resource: "Referral",
    resourceId: referral.id,
    metadata: { status: "ADMITTED", convertedPatientId: patient.id },
  });

  redirect(`/patients/${patient.id}`);
}
