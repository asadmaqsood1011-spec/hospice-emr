"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { audit } from "@/lib/audit";

const BG_TTL_MIN = 30;

export async function breakGlass(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const patientId = String(formData.get("patientId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!patientId || reason.length < 10) {
    redirect(`/break-glass/${patientId}?error=reason`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`bg-${patientId}`, "1", {
    maxAge: BG_TTL_MIN * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await audit({
    userId: session.user.id,
    patientId,
    action: "BREAK_GLASS",
    resource: "Patient",
    resourceId: patientId,
    reason,
  });

  redirect(`/patients/${patientId}`);
}
