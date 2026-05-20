"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SkeletonLines } from "@/components/ui/skeleton";

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide soft">AI handoff</span>
        <div className="flex gap-2">
          {summary && (
            <button type="button" onClick={copy} className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          )}
          <button type="button" onClick={generate} disabled={loading} className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs disabled:opacity-50">
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? "Generating" : summary ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>
      {loading && <SkeletonLines lines={4} />}
      {summary ? (
        <p className="rounded-lg border hairline bg-[var(--surface-muted)] p-3 text-sm leading-relaxed">{summary}</p>
      ) : !loading ? (
        <p className="text-sm muted">No generated handoff yet.</p>
      ) : null}
    </div>
  );
}
