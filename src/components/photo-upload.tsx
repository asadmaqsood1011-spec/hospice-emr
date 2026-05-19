"use client";

import { useState } from "react";
import { toast } from "sonner";

export function PhotoUpload({ patientId }: { patientId: string }) {
  const [busy, setBusy] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Photo added");
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={upload} className="space-y-3">
      <input
        name="photo"
        type="file"
        accept="image/*"
        capture="environment"
        required
        className="block w-full text-sm text-slate-800 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white file:font-semibold"
      />
      <input
        name="caption"
        placeholder="Caption, e.g. wound photo or bottle label"
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
      />
      <button type="submit" disabled={busy} className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50">
        {busy ? "Uploading..." : "Upload Photo"}
      </button>
    </form>
  );
}
