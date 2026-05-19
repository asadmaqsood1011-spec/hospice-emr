import { prisma } from "./prisma";
import type { AuditAction } from "@/generated/prisma";
import { headers } from "next/headers";

type AuditInput = {
  userId?: string | null;
  patientId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append-only PHIPA-aware audit log.
 * Every read/write of PHI MUST call this. Never delete or update rows.
 */
export async function audit(input: AuditInput): Promise<void> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      patientId: input.patientId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      reason: input.reason ?? null,
      ip,
      userAgent,
      metadata: input.metadata as never,
    },
  });
}
