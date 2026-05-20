import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requirePatientAccess } from "@/lib/patient-access";

const Body = z.object({
  kind: z.enum(["pain-crisis", "death", "urgent-followup"]),
  message: z.string().min(3).max(300),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requirePatientAccess(session, id, "patient.update");
  if (!access.ok) return access.response;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { mrn: true },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipients = await prisma.user.findMany({
    where: { active: true, oncallPhone: { not: null } },
    select: { oncallPhone: true },
  });

  const mrnSuffix = patient.mrn.slice(-4).padStart(patient.mrn.length, "*");
  const body = `[Hospice EMR] ${parsed.data.kind}: MRN ${mrnSuffix}. ${parsed.data.message}`;
  const sent = await sendTwilio(recipients.map((r) => r.oncallPhone).filter(Boolean) as string[], body);

  await audit({
    userId: session.user.id,
    patientId: id,
    action: "CREATE",
    resource: "SmsAlert",
    resourceId: id,
    metadata: { kind: parsed.data.kind, sent, recipients: recipients.length, ...(access.viaBreakGlass ? { viaBreakGlass: true } : {}) },
  });

  return NextResponse.json({ sent, recipients: recipients.length });
}

async function sendTwilio(to: string[], body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;
  if (!sid || !token || !from || to.length === 0) return false;

  await Promise.all(
    to.map((recipient) =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: recipient, Body: body }),
      })
    )
  );
  return true;
}
