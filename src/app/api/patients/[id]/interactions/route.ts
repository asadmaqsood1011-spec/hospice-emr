import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkInteractions } from "@/lib/ddi";
import { requirePatientAccess } from "@/lib/patient-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requirePatientAccess(session, id, "patient.read");
  if (!access.ok) return access.response;

  const meds = await prisma.medication.findMany({
    where: { patientId: id, discontinuedAt: null },
    select: { name: true },
  });

  const alerts = await checkInteractions(meds.map((m) => m.name));
  return NextResponse.json({ alerts });
}
