import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "READ",
    resource: "FHIRPatient",
    resourceId: patient.id,
  });

  return NextResponse.json({
    resourceType: "Patient",
    id: patient.id,
    identifier: [{ system: "urn:hospice-emr:mrn", value: patient.mrn }],
    name: [{ family: patient.lastName, given: [patient.firstName] }],
    gender: patient.sex === "F" ? "female" : patient.sex === "M" ? "male" : "unknown",
    birthDate: patient.dob.toISOString().slice(0, 10),
    telecom: patient.phone ? [{ system: "phone", value: patient.phone }] : undefined,
    address: patient.address ? [{ text: patient.address }] : undefined,
    extension: [
      { url: "urn:hospice-emr:code-status", valueCode: patient.codeStatus },
      { url: "urn:hospice-emr:level-of-care", valueCode: patient.levelOfCare },
      { url: "urn:hospice-emr:primary-diagnosis", valueString: patient.primaryDx },
    ].filter((e) => e.valueCode || e.valueString),
  });
}
