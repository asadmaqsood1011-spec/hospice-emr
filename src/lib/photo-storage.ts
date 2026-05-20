export function publicBlobPhotosEnabled(): boolean {
  return process.env.ALLOW_PUBLIC_BLOB_PHOTOS === "true";
}
