import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission } from "@/lib/rbac";
import { cookieName, verify as verifyBreakGlass } from "@/lib/break-glass";

export async function requirePatientAccess(
  session: Session,
  patientId: string,
  perm: Permission = "patient.read"
) {
  if (!can(session.user.role, perm)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, deletedAt: true, lockbox: true },
  });

  if (!patient || patient.deletedAt) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  if (patient.lockbox) {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName(patientId))?.value;
    if (!token || !verifyBreakGlass(token, session.user.id, patientId)) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Break-glass required" }, { status: 403 }),
      };
    }
    return { ok: true as const, patient, viaBreakGlass: true };
  }

  return { ok: true as const, patient, viaBreakGlass: false };
}
