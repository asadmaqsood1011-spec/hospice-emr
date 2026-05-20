// Naive in-memory rate limiter. Per-process, so OK for single-instance Vercel functions
// on the same region but will reset on cold start. For multi-instance, switch to Upstash/Redis.
// For PHIPA-aware ops + OpenAI cost guard this is a defense-in-depth layer, not a hard guarantee.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

/**
 * @param key   unique per actor + action, e.g. `transcribe:${userId}`
 * @param max   max requests in the window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      remaining: max - 1,
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= max) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: max - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

export function rateLimitHeaders(r: RateLimitResult, max: number): HeadersInit {
  return {
    "X-RateLimit-Limit": String(max),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
    ...(r.retryAfterSeconds > 0 ? { "Retry-After": String(r.retryAfterSeconds) } : {}),
  };
}
