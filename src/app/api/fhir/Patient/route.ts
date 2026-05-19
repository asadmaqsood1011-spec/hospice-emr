import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  return NextResponse.json({
    resourceType: "Bundle",
    type: "searchset",
    total: patients.length,
    entry: patients.map((patient) => ({
      fullUrl: `/api/fhir/Patient/${patient.id}`,
      resource: toFhirPatient(patient),
    })),
  });
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
