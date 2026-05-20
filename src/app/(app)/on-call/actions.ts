"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

export async function recordHandoff(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!can(session.user.role, "note.create")) return { error: "Forbidden" };

  const patientId = String(formData.get("patientId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!patientId || message.length < 5) return { error: "Handoff note required" };

  await audit({
    userId: session.user.id,
    patientId,
    action: "CREATE",
    resource: "OnCallHandoff",
    resourceId: patientId,
    reason: "on-call handoff",
    metadata: { message },
  });

  revalidatePath("/on-call");
  return { ok: true };
}
