import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await req.formData();
  const file = form.get("photo");
  const caption = String(form.get("caption") ?? "").trim() || null;

  if (!(file instanceof File)) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Image only" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo max is 4MB" }, { status: 413 });

  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const url = `data:${file.type};base64,${bytes.toString("base64")}`;

  const photo = await prisma.photo.create({
    data: {
      patientId: id,
      filename: file.name || "photo",
      url,
      caption,
      mimeType: file.type,
      bytes: file.size,
      uploadedBy: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    patientId: id,
    action: "CREATE",
    resource: "Photo",
    resourceId: photo.id,
    metadata: { filename: file.name, bytes: file.size },
  });

  return NextResponse.json({ id: photo.id });
}
