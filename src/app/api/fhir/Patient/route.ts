import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { fhirGate } from "@/lib/fhir";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const blocked = fhirGate(req);
  if (blocked) return blocked;

  const clientId = (req.headers.get("authorization") ?? "anon").slice(-12);
  const rl = rateLimit(`fhir:${clientId}:list`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { resourceType: "OperationOutcome", issue: [{ severity: "error", code: "throttled" }] },
      { status: 429, headers: rateLimitHeaders(rl, 60) }
    );
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? undefined;
  const identifier = url.searchParams.get("identifier") ?? undefined;

  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      ...(identifier ? { mrn: identifier } : {}),
      ...(name
        ? {
            OR: [
              { firstName: { contains: name, mode: "insensitive" } },
              { lastName: { contains: name, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: 25,
  });

  await audit({
    action: "READ",
    resource: "FhirPatient",
    metadata: { fhirClient: clientId, query: { name: Boolean(name), identifier: Boolean(identifier) }, count: patients.length },
  });

  return NextResponse.json({
    resourceType: "Bundle",
    type: "searchset",
    total: patients.length,
    entry: patients.map((patient) => ({
      fullUrl: `/api/fhir/Patient/${patient.id}`,
      resource: toFhirPatient(patient),
    })),
  }, { headers: rateLimitHeaders(rl, 60) });
}

function toFhirPatient(patient: {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: Date;
  sex: string | null;
  phone: string | null;
  address: string | null;
}) {
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: [{ system: "urn:hospice-emr:mrn", value: patient.mrn }],
    name: [{ family: patient.lastName, given: [patient.firstName] }],
    gender: fhirGender(patient.sex),
    birthDate: patient.dob.toISOString().slice(0, 10),
    telecom: patient.phone ? [{ system: "phone", value: patient.phone }] : undefined,
    address: patient.address ? [{ text: patient.address }] : undefined,
  };
}

function fhirGender(sex: string | null) {
  if (sex === "F") return "female";
  if (sex === "M") return "male";
  return "unknown";
}
