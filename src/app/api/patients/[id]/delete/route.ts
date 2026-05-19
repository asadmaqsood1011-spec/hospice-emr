import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const Body = z.object({ reason: z.string().min(10) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Reason required (min 10 chars)" }, { status: 400 });

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.patient.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: session.user.id,
      deletedReason: parsed.data.reason,
    },
  });

  await audit({
    userId: session.user.id,
    patientId: id,
    action: "DELETE",
    resource: "Patient",
    resourceId: id,
    reason: parsed.data.reason,
    metadata: { event: "right-to-erasure" },
  });

  return NextResponse.json({ ok: true });
}
