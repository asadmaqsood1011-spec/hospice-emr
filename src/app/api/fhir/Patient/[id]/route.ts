import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { fhirGate } from "@/lib/fhir";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = fhirGate(req);
  if (blocked) return blocked;

  const clientId = (req.headers.get("authorization") ?? "anon").slice(-12);
  const rl = rateLimit(`fhir:${clientId}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { resourceType: "OperationOutcome", issue: [{ severity: "error", code: "throttled" }] },
      { status: 429, headers: rateLimitHeaders(rl, RATE_MAX) }
    );
  }

  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) {
    return NextResponse.json(
      { resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] },
      { status: 404 }
    );
  }

  await audit({
    patientId: patient.id,
    action: "READ",
    resource: "FhirPatient",
    resourceId: patient.id,
    metadata: { fhirClient: clientId },
  });

  return NextResponse.json(
    {
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
    },
    { headers: rateLimitHeaders(rl, RATE_MAX) }
  );
}
