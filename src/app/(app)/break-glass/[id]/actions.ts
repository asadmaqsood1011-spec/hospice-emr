"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sign, cookieName } from "@/lib/break-glass";

const BG_TTL_MIN = 30;

// Only these roles may break glass on a locked chart.
const ELIGIBLE_ROLES = new Set(["ADMIN", "MD", "RN"]);

export async function breakGlass(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ELIGIBLE_ROLES.has(session.user.role as string)) {
    redirect("/patients?error=forbidden");
  }

  const patientId = String(formData.get("patientId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!patientId || reason.length < 10) {
    redirect(`/break-glass/${patientId}?error=reason`);
  }

  // Verify patient exists AND is actually lockbox; reject otherwise.
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, lockbox: true, deletedAt: true },
  });
  if (!patient || patient.deletedAt) {
    redirect("/patients?error=notfound");
  }
  if (!patient.lockbox) {
    // No need for break-glass on a non-lockbox chart.
    redirect(`/patients/${patientId}`);
  }

  const expiresAt = Date.now() + BG_TTL_MIN * 60_000;
  const token = sign(session.user.id, patientId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(cookieName(patientId), token, {
    maxAge: BG_TTL_MIN * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/`,
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "BREAK_GLASS",
    resource: "Patient",
    resourceId: patientId,
    reason,
    metadata: { expiresAtMs: expiresAt },
  });

  redirect(`/patients/${patientId}`);
}
