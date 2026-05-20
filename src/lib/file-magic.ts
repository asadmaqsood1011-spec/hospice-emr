// Sniff first bytes to verify image type. Trusting client MIME is unsafe.
// Rejects anything not PNG/JPEG/GIF/WebP/HEIC/HEIF.

const MAGIC: Array<{ mime: string; ext: string; check: (b: Buffer) => boolean }> = [
  { mime: "image/png", ext: "png", check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", ext: "gif", check: (b) => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: "image/webp", ext: "webp", check: (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: "image/heic", ext: "heic", check: (b) => b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && (b[8] === 0x68 || b[8] === 0x6d) },
];

export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  for (const m of MAGIC) {
    if (m.check(buf)) return { mime: m.mime, ext: m.ext };
  }
  return null;
}
