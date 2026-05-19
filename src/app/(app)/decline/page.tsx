import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { computeDeclineSignals } from "@/lib/decline";

export default async function DeclinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const signals = (await computeDeclineSignals()).sort((a, b) => {
    const order = { imminent: 0, declining: 1, stable: 2 };
    return order[a.flag] - order[b.flag];
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Clinical Decline Signals</h1>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 border-b-2 border-stone-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-700 font-bold">
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Latest PPS</th>
              <th className="px-4 py-3">PPS Delta / week</th>
              <th className="px-4 py-3">Symptoms Delta / week</th>
              <th className="px-4 py-3">Observed</th>
              <th className="px-4 py-3">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {signals.map((s) => (
              <tr key={s.patientId} className="hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${s.patientId}`}
                    className="font-semibold text-teal-800 hover:text-teal-600 hover:underline"
                  >
                    {s.patientName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">
                  {s.latestPps === null ? "-" : `${s.latestPps}%`}
                </td>
                <td className={`px-4 py-3 font-mono ${s.ppsSlope < -2 ? "text-red-700 font-bold" : "text-slate-800"}`}>
                  {s.ppsSlope > 0 ? "+" : ""}
                  {s.ppsSlope}
                </td>
                <td className={`px-4 py-3 font-mono ${s.symptomSlope > 0.5 ? "text-red-700 font-bold" : "text-slate-800"}`}>
                  {s.symptomSlope > 0 ? "+" : ""}
                  {s.symptomSlope}
                </td>
                <td className="px-4 py-3 text-slate-700">{s.daysObserved}d</td>
                <td className="px-4 py-3">
                  <FlagBadge flag={s.flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlagBadge({ flag }: { flag: "imminent" | "declining" | "stable" }) {
  const map = {
    imminent: "bg-red-100 text-red-800 border-red-300",
    declining: "bg-amber-100 text-amber-900 border-amber-300",
    stable: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded border ${map[flag]}`}>
      {flag.toUpperCase()}
    </span>
  );
}
