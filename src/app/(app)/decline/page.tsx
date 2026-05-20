import Link from "next/link";
import { Activity, Search } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { computeDeclineSignals } from "@/lib/decline";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DeclinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const signals = (await computeDeclineSignals()).sort((a, b) => {
    const order = { imminent: 0, declining: 1, stable: 2 };
    return order[a.flag] - order[b.flag];
  });

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
          <Activity className="h-3.5 w-3.5" />
          Triage
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Trajectory triage</h1>
        <p className="mt-1 text-sm muted">Decline signals ranked for daily clinical review.</p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b hairline bg-[var(--surface-muted)]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide muted">
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Latest PPS</th>
              <th className="px-4 py-3">PPS delta / week</th>
              <th className="px-4 py-3">Symptoms delta / week</th>
              <th className="px-4 py-3">Observed</th>
              <th className="px-4 py-3">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {signals.map((s) => (
              <tr key={s.patientId} className="transition-colors hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3">
                  <Link href={`/patients/${s.patientId}`} className="font-semibold text-[var(--primary)] hover:underline">
                    {s.patientName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">{s.latestPps === null ? "-" : `${s.latestPps}%`}</td>
                <td className={`px-4 py-3 font-mono ${s.ppsSlope < -2 ? "font-bold text-red-700 dark:text-red-300" : ""}`}>
                  {s.ppsSlope > 0 ? "+" : ""}
                  {s.ppsSlope}
                </td>
                <td className={`px-4 py-3 font-mono ${s.symptomSlope > 0.5 ? "font-bold text-red-700 dark:text-red-300" : ""}`}>
                  {s.symptomSlope > 0 ? "+" : ""}
                  {s.symptomSlope}
                </td>
                <td className="px-4 py-3 muted">{s.daysObserved}d</td>
                <td className="px-4 py-3">
                  <FlagBadge flag={s.flag} />
                </td>
              </tr>
            ))}
            {signals.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6">
                  <EmptyState icon={Search} title="No trajectory signals" hint="Scores appear after PPS and symptom observations are documented." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlagBadge({ flag }: { flag: "imminent" | "declining" | "stable" }) {
  const tone = flag === "imminent" ? "danger" : flag === "declining" ? "warning" : "success";
  return <Badge tone={tone}>{flag.toUpperCase()}</Badge>;
}
