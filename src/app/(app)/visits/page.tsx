import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; days?: string }>;
}) {
  const session = await auth();
  const { type, days } = await searchParams;

  const sinceDays = Number(days ?? "7");
  const since = new Date(Date.now() - sinceDays * 86400000);

  const visits = await prisma.visit.findMany({
    where: {
      startedAt: { gte: since },
      ...(type ? { type: type as never } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      provider: { select: { name: true, role: true } },
      note: { select: { signed: true, assessment: true } },
    },
    take: 100,
  });

  await audit({
    userId: session?.user.id,
    action: "READ",
    resource: "VisitList",
    metadata: { count: visits.length, days: sinceDays, type },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Visits</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            {visits.length} visit{visits.length === 1 ? "" : "s"} in last {sinceDays} days
          </p>
        </div>
      </div>

      <form className="mb-4 flex gap-2 flex-wrap">
        <select
          name="type"
          defaultValue={type ?? ""}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
        >
          <option value="">All types</option>
          <option value="RN_VISIT">RN visit</option>
          <option value="MD_VISIT">MD visit</option>
          <option value="SW_VISIT">SW visit</option>
          <option value="CHAPLAIN_VISIT">Chaplain visit</option>
          <option value="AIDE_VISIT">Aide visit</option>
          <option value="VOLUNTEER_VISIT">Volunteer visit</option>
          <option value="IDG_MEETING">IDG meeting</option>
          <option value="PHONE">Phone</option>
        </select>
        <select
          name="days"
          defaultValue={String(sinceDays)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
        >
          <option value="1">Last 24h</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800"
        >
          Filter
        </button>
      </form>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 border-b-2 border-stone-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-700 font-bold">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {visits.map((v) => (
              <tr key={v.id} className="hover:bg-teal-50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-700">
                  {new Date(v.startedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${v.patient.id}`}
                    className="font-semibold text-teal-800 hover:text-teal-600 hover:underline"
                  >
                    {v.patient.firstName} {v.patient.lastName}
                  </Link>
                  <div className="text-xs font-mono text-slate-500">{v.patient.mrn}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium bg-stone-200 text-slate-800 px-2 py-1 rounded">
                    {v.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {v.provider.name}
                  <span className="text-xs text-slate-500"> ({v.provider.role})</span>
                </td>
                <td className="px-4 py-3 text-slate-700 max-w-md truncate">
                  {v.note?.assessment ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {v.signed ? (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded">
                      Signed
                    </span>
                  ) : v.note ? (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-1 rounded">
                      Draft
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-stone-700 bg-stone-200 px-2 py-1 rounded">
                      No note
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                  No visits in selected window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
