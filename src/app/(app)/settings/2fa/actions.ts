"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { clinicalRoleNeedsTotp } from "@/lib/login-guard";

export async function enable2fa(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Code must be 6 digits" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret) return { error: "No secret found, refresh page" };

  if (!verifyToken(code, user.totpSecret)) return { error: "Invalid code, try again" };

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });

  await audit({
    userId: user.id,
    action: "UPDATE",
    resource: "User",
    resourceId: user.id,
    metadata: { event: "2fa-enabled" },
  });

  return { ok: true };
}

export async function disable2fa(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Current 2FA code required" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpEnabled || !user.totpSecret) return { error: "2FA is not enabled" };
  if (clinicalRoleNeedsTotp(user.role)) {
    return { error: "Clinical accounts cannot self-disable 2FA. Ask an admin." };
  }
  if (!verifyToken(code, user.totpSecret)) return { error: "Invalid 2FA code" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  await audit({
    userId: session.user.id,
    action: "UPDATE",
    resource: "User",
    resourceId: session.user.id,
    metadata: { event: "2fa-disabled" },
  });

  return { ok: true };
}
