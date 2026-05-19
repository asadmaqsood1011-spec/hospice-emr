"use client";

import { useState } from "react";
import { toast } from "sonner";

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
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Family update letter
        </span>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {loading ? "Drafting..." : letter ? "Redraft" : "Draft Letter"}
        </button>
      </div>
      {letter ? (
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-serif leading-relaxed"
        />
      ) : null}
    </div>
  );
}
