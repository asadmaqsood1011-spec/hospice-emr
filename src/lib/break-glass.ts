// Break-glass cookie helpers — signed + bound to (user, patient, expiresAt).
// Cookie value format: base64(userId|patientId|expiresAtMs).sigHex

import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? "";

export function cookieName(patientId: string): string {
  return `bg-${patientId}`;
}

export function sign(userId: string, patientId: string, expiresAtMs: number): string {
  const payload = `${userId}|${patientId}|${expiresAtMs}`;
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verify(token: string, userId: string, patientId: string): boolean {
  if (!SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf-8");
  } catch {
    return false;
  }
  const [tokenUserId, tokenPatientId, expiresStr] = payload.split("|");
  if (tokenUserId !== userId || tokenPatientId !== patientId) return false;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
