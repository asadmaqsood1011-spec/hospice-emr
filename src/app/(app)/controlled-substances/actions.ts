"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

const EVENTS = new Set(["count", "administer", "waste", "receive"]);

export async function recordControlledSubstanceEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!can(session.user.role, "patient.update")) return { error: "Forbidden" };

  const patientId = String(formData.get("patientId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");
  const eventType = String(formData.get("eventType") ?? "");
  const quantity = String(formData.get("quantity") ?? "").trim();
  const witness = String(formData.get("witness") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!patientId || !medicationId || !EVENTS.has(eventType)) return { error: "Missing required fields" };
  if (!quantity || Number.isNaN(Number(quantity))) return { error: "Quantity must be numeric" };
  if ((eventType === "waste" || eventType === "count") && reason.length < 5) {
    return { error: "Reason/count note required" };
  }

  const medication = await prisma.medication.findFirst({
    where: {
      id: medicationId,
      patientId,
      controlled: true,
      discontinuedAt: null,
      patient: { deletedAt: null },
    },
    include: { patient: { select: { id: true } } },
  });
  if (!medication) return { error: "Controlled medication not found" };

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "ControlledSubstanceLog",
    resourceId: medicationId,
    reason,
    metadata: {
      eventType,
      medicationName: medication.name,
      dose: medication.dose,
      quantity: Number(quantity),
      witness: witness || null,
    },
  });

  revalidatePath("/controlled-substances");
  return { ok: true };
}
