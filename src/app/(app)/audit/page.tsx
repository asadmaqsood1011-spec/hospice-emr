import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/patients");

  const logs = await prisma.auditLog.findMany({
    orderBy: { ts: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, role: true } },
      patient: { select: { mrn: true, firstName: true, lastName: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Audit Log</h1>
      <p className="text-sm text-slate-500 mb-4">
        Immutable record of all PHI access. Last 200 events.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Resource</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                  {new Date(l.ts).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {l.user ? (
                    <span>
                      {l.user.name}{" "}
                      <span className="text-xs text-slate-400">({l.user.role})</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">system</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{l.action}</span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {l.resource}
                  {l.resourceId && (
                    <span className="font-mono text-xs text-slate-400"> #{l.resourceId.slice(0, 6)}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {l.patient ? `${l.patient.firstName} ${l.patient.lastName}` : "—"}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{l.ip ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{l.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
