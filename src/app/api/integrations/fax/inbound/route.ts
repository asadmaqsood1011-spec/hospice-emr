import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());

  const mrn = String(data.mrn ?? data.MRN ?? "").trim();
  const patient = mrn
    ? await prisma.patient.findUnique({ where: { mrn }, select: { id: true } })
    : null;

  const fax = await prisma.fax.create({
    data: {
      patientId: patient?.id,
      direction: "inbound",
      from: stringOrNull(data.from ?? data.From),
      to: stringOrNull(data.to ?? data.To),
      pages: numberOrNull(data.pages ?? data.NumPages),
      status: patient ? "received" : "pending-link",
      pdfUrl: stringOrNull(data.pdfUrl ?? data.MediaUrl ?? data.MediaUrl0),
      twilioSid: stringOrNull(data.twilioSid ?? data.MessageSid ?? data.Sid),
    },
  });

  await audit({
    userId: null,
    patientId: patient?.id,
    action: "CREATE",
    resource: "InboundFax",
    resourceId: fax.id,
    metadata: { status: fax.status },
  });

  return NextResponse.json({ id: fax.id, linked: Boolean(patient) });
}

function stringOrNull(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
