"use client";

import { useState } from "react";
import { toast } from "sonner";

export function SummaryCard({ patientId }: { patientId: string }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data.summary ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(summary);
    toast.success("Copied to clipboard");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Handoff summary
        </span>
        <div className="flex gap-2">
          {summary && (
            <button
              type="button"
              onClick={copy}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? "Generating..." : summary ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>
      {summary ? (
        <p className="text-sm text-slate-800 leading-relaxed bg-stone-50 rounded-lg p-3">{summary}</p>
      ) : null}
    </div>
  );
}
