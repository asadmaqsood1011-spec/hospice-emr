import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public health endpoint. No PHI. No auth.
// Used by uptime monitors (Better Stack, Pingdom) and Vercel health checks.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
const REGION = process.env.VERCEL_REGION ?? "local";

export async function GET() {
  const startedAt = Date.now();

  let dbOk = false;
  let dbLatency: number | null = null;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";
  const code = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      version: VERSION,
      region: REGION,
      checks: {
        db: { ok: dbOk, latencyMs: dbLatency },
      },
      respondedInMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: code,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
