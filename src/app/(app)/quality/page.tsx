import { BarChart3, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { computeHisMeasures } from "@/lib/his";
import { Badge } from "@/components/ui/badge";

export default async function QualityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/patients");

  const measures = await computeHisMeasures();
  const avg = measures.length ? measures.reduce((s, m) => s + m.rate, 0) / measures.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin only
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Quality Measures</h1>
          <p className="mt-1 text-sm muted">HIS-style pilot quality view. Hidden from clinician nav.</p>
        </div>
        <div className="surface-card px-5 py-4 text-right">
          <div className="text-3xl font-bold tabular-nums text-[var(--primary)]">{Math.round(avg)}%</div>
          <div className="text-xs font-semibold uppercase tracking-wide muted">Composite</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {measures.map((m) => (
          <article key={m.key} className="surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{m.label}</h2>
              <RateBadge rate={m.rate} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-mono muted">
              <BarChart3 className="h-4 w-4" />
              {m.numerator} / {m.denominator}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div className={`h-full ${barColor(m.rate)}`} style={{ width: `${m.rate}%` }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const tone = rate >= 85 ? "success" : rate >= 70 ? "warning" : "danger";
  return <Badge tone={tone}>{rate}%</Badge>;
}

function barColor(rate: number) {
  if (rate >= 85) return "bg-emerald-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-red-500";
}
