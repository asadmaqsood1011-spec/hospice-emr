import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

function keyFor(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function checkLoginAllowed(email: string) {
  const now = Date.now();
  const since = new Date(now - WINDOW_MS);
  const failures = await prisma.auditLog.count({
    where: {
      action: "LOGIN",
      resource: "LoginFailure",
      resourceId: keyFor(email),
      ts: { gte: since },
    },
  });

  if (failures >= MAX_FAILURES) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(LOCK_MS / 1000),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export async function recordLoginFailure(email: string, reason: string) {
  await prisma.auditLog.create({
    data: {
      action: "LOGIN",
      resource: "LoginFailure",
      resourceId: keyFor(email),
      reason,
      metadata: { windowMs: WINDOW_MS, maxFailures: MAX_FAILURES },
    },
  });
}

export async function recordLoginSuccess(userId: string) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: "LOGIN",
      resource: "User",
      resourceId: userId,
      metadata: { event: "login-success" },
    },
  });
}

export function clinicalRoleNeedsTotp(role: string | undefined | null) {
  return role === "MD" || role === "RN" || role === "SW" || role === "CHAPLAIN";
}
