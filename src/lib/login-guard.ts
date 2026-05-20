type LoginBucket = {
  failures: number;
  windowResetAt: number;
  lockedUntil: number;
};

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const buckets = new Map<string, LoginBucket>();

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

export function checkLoginAllowed(email: string) {
  const now = Date.now();
  const key = keyFor(email);
  const bucket = buckets.get(key);

  if (!bucket) return { ok: true, retryAfterSeconds: 0 };
  if (bucket.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }
  if (bucket.windowResetAt <= now) buckets.delete(key);

  return { ok: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(email: string) {
  const now = Date.now();
  const key = keyFor(email);
  const existing = buckets.get(key);
  const bucket =
    !existing || existing.windowResetAt <= now
      ? { failures: 0, windowResetAt: now + WINDOW_MS, lockedUntil: 0 }
      : existing;

  bucket.failures += 1;
  if (bucket.failures >= MAX_FAILURES) {
    bucket.lockedUntil = now + LOCK_MS;
  }
  buckets.set(key, bucket);

  return {
    locked: bucket.lockedUntil > now,
    retryAfterSeconds:
      bucket.lockedUntil > now ? Math.ceil((bucket.lockedUntil - now) / 1000) : 0,
  };
}

export function clearLoginFailures(email: string) {
  buckets.delete(keyFor(email));
}

export function clinicalRoleNeedsTotp(role: string | undefined | null) {
  return role === "ADMIN" || role === "MD" || role === "RN" || role === "SW" || role === "CHAPLAIN";
}
