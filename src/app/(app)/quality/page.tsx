import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { computeHisMeasures } from "@/lib/his";

export default async function QualityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const measures = await computeHisMeasures();
  const avg = measures.reduce((s, m) => s + m.rate, 0) / measures.length;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Quality Measures (HIS)</h1>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-teal-700">{Math.round(avg)}%</span>
          <span className="text-sm font-medium text-slate-600">composite score</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {measures.map((m) => (
          <div key={m.key} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-900">{m.label}</h3>
              <RateBadge rate={m.rate} />
            </div>
            <div className="text-xs font-mono text-slate-700">
              {m.numerator} / {m.denominator}
            </div>
            <div className="mt-2 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div className={`h-full ${barColor(m.rate)}`} style={{ width: `${m.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const cls = rate >= 85
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : rate >= 70
      ? "bg-amber-100 text-amber-900 border-amber-300"
      : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`text-sm font-bold px-2 py-0.5 rounded border ${cls}`}>
      {rate}%
    </span>
  );
}

function barColor(rate: number) {
  if (rate >= 85) return "bg-emerald-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-red-500";
}
