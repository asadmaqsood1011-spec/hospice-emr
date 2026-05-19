import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { buildChartPdf } from "@/lib/pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      allergies: true,
      meds: true,
      contacts: true,
      esasScores: { orderBy: { recordedAt: "asc" } },
      ppsScores: { orderBy: { recordedAt: "asc" } },
      clinicalNotes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, role: true } } },
      },
      photos: true,
    },
  });

  if (!patient) return new NextResponse("Not found", { status: 404 });

  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "EXPORT",
    resource: "Patient",
    resourceId: patient.id,
    metadata: { format },
  });

  if (format === "pdf") {
    const bytes = await buildChartPdf({
      patient: {
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dob: patient.dob,
        sex: patient.sex,
        primaryDx: patient.primaryDx,
        primaryDxIcd: patient.primaryDxIcd,
        codeStatus: patient.codeStatus,
        levelOfCare: patient.levelOfCare,
        admittedAt: patient.admittedAt,
      },
      meds: patient.meds.filter((m) => !m.discontinuedAt),
      notes: patient.clinicalNotes.slice(0, 20),
    });
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${patient.mrn}-chart.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // JSON export
  return new NextResponse(JSON.stringify(patient, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${patient.mrn}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
