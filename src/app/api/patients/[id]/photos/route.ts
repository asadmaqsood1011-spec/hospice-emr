import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sniffImage } from "@/lib/file-magic";
import { logger } from "@/lib/logger";
import { requirePatientAccess } from "@/lib/patient-access";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requirePatientAccess(session, id, "patient.update");
  if (!access.ok) return access.response;

  const form = await req.formData();
  const file = form.get("photo");
  const caption = String(form.get("caption") ?? "").trim() || null;

  if (!(file instanceof File)) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo max is 4MB" }, { status: 413 });

  // Sniff magic bytes; never trust client MIME.
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImage(buf);
  if (!sniffed) {
    return NextResponse.json({ error: "Not a recognized image format" }, { status: 415 });
  }

  // Upload to Vercel Blob. Requires BLOB_READ_WRITE_TOKEN env.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error({ route: "photos" }, "BLOB_READ_WRITE_TOKEN missing");
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const path = `patients/${id}/${Date.now()}-${crypto.randomUUID()}.${sniffed.ext}`;

  let blob;
  try {
    blob = await put(path, buf, {
      access: "public",
      contentType: sniffed.mime,
      // Vercel Blob is public-read here, so app UI serves it through /api/photos/:id.
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });
  } catch (err) {
    logger.error({ route: "photos", err: (err as Error).message }, "Blob upload failed");
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const photo = await prisma.photo.create({
    data: {
      patientId: id,
      filename: file.name || `photo.${sniffed.ext}`,
      url: blob.url,
      caption,
      mimeType: sniffed.mime,
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
    metadata: { filename: file.name, bytes: file.size, mime: sniffed.mime },
  });

  return NextResponse.json({ id: photo.id, url: `/api/photos/${photo.id}` });
}
