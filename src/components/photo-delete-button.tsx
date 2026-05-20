"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function PhotoDeleteButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function deletePhoto() {
    if (!confirm("Delete this photo from the chart?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Photo deleted");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deletePhoto}
      disabled={busy}
      aria-label="Delete photo"
      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white/95 text-red-700 shadow-sm opacity-0 transition hover:bg-red-50 disabled:opacity-50 group-hover:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
