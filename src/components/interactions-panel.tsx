"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonLines } from "@/components/ui/skeleton";

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

  if (loading) return <SkeletonLines lines={3} />;
  if (!alerts || alerts.length === 0) return <EmptyState icon={CheckCircle2} title="No known interactions" />;

  return (
    <ul className="space-y-2">
      {alerts.map((a, i) => (
        <li key={i} className="rounded-lg border hairline bg-[var(--surface-muted)] p-3">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={a.severity === "high" ? "danger" : a.severity === "moderate" ? "warning" : "neutral"}>
              <ShieldAlert className="h-3.5 w-3.5" />
              {a.severity}
            </Badge>
            <span className="text-sm font-semibold">{a.drugA} x {a.drugB}</span>
            <span className="ml-auto text-xs soft">{a.source}</span>
          </div>
          <p className="text-sm muted">{a.message}</p>
        </li>
      ))}
    </ul>
  );
}
