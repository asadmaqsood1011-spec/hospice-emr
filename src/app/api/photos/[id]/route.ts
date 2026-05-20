import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { requirePatientAccess } from "@/lib/patient-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { patient: { select: { id: true, deletedAt: true } } },
  });

  if (!photo || photo.patient.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requirePatientAccess(session, photo.patientId, "patient.read");
  if (!access.ok) return access.response;

  const privateBlob = await get(photo.url, { access: "private", useCache: false }).catch((err: Error) => {
    logger.error({ route: "photos.get", err: err.message }, "Blob fetch failed");
    return null;
  });

  if (!privateBlob?.stream) {
    return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
  }

  await audit({
    userId: session.user.id,
    patientId: photo.patientId,
    action: "READ",
    resource: "Photo",
    resourceId: photo.id,
    metadata: access.viaBreakGlass ? { viaBreakGlass: true } : undefined,
  });

  return new NextResponse(privateBlob.stream, {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${encodeURIComponent(photo.filename)}"`,
    },
  });
}
