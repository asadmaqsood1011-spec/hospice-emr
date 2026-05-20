"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { SkeletonLines } from "@/components/ui/skeleton";

export function FamilyLetter({ patientId }: { patientId: string }) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/family-letter`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLetter(data.letter ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide soft">Family update letter</span>
        <button type="button" onClick={generate} disabled={loading} className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs disabled:opacity-50">
          <PenLine className="h-3.5 w-3.5" />
          {loading ? "Drafting" : letter ? "Redraft" : "Draft"}
        </button>
      </div>
      {loading && <SkeletonLines lines={5} />}
      {letter ? (
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={8}
          className="w-full rounded-lg border hairline px-3 py-2 text-sm font-serif leading-relaxed"
        />
      ) : !loading ? (
        <p className="text-sm muted">No family update drafted.</p>
      ) : null}
    </div>
  );
}
