import { FileSearch, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
          <FileSearch className="h-3.5 w-3.5" />
          Admin audit
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm muted">Immutable PHI access trail. Last 200 events.</p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b hairline bg-[var(--surface-muted)]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide muted">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {logs.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3 font-mono text-xs muted">{new Date(l.ts).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {l.user ? (
                    <span>
                      {l.user.name} <span className="text-xs muted">({l.user.role})</span>
                    </span>
                  ) : (
                    <span className="muted">system</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge>{l.action}</Badge>
                </td>
                <td className="px-4 py-3 muted">
                  {l.resource}
                  {l.resourceId && <span className="font-mono text-xs soft"> #{l.resourceId.slice(0, 6)}</span>}
                </td>
                <td className="px-4 py-3">{l.patient ? `${l.patient.firstName} ${l.patient.lastName}` : "--"}</td>
                <td className="px-4 py-3 font-mono text-xs muted">{l.ip ?? "--"}</td>
                <td className="px-4 py-3 muted">{l.reason ?? "--"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6">
                  <EmptyState icon={Search} title="No audit events" hint="Events appear after authenticated activity." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
