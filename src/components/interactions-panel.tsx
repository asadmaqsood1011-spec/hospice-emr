"use client";

import { useEffect, useState } from "react";

type Alert = {
  severity: "high" | "moderate" | "low";
  drugA: string;
  drugB: string;
  message: string;
  source: string;
};

export function InteractionsPanel({ patientId }: { patientId: string }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/interactions`)
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return <div className="text-sm text-slate-500">Checking interactions...</div>;
  }
  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 font-medium">
        ✓ No known interactions detected.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a, i) => (
        <li
          key={i}
          className={`rounded-lg p-3 border ${
            a.severity === "high"
              ? "bg-red-50 border-red-300"
              : a.severity === "moderate"
                ? "bg-amber-50 border-amber-300"
                : "bg-slate-50 border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                a.severity === "high"
                  ? "bg-red-200 text-red-900"
                  : a.severity === "moderate"
                    ? "bg-amber-200 text-amber-900"
                    : "bg-slate-200 text-slate-800"
              }`}
            >
              {a.severity}
            </span>
            <span className="font-semibold text-sm text-slate-900">
              {a.drugA} × {a.drugB}
            </span>
            <span className="text-xs text-slate-500 ml-auto">{a.source}</span>
          </div>
          <p className="text-sm text-slate-800">{a.message}</p>
        </li>
      ))}
    </ul>
  );
}
