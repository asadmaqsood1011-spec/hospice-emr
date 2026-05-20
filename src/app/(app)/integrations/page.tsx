import { CalendarDays, Inbox, RadioTower } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/patients");

  const faxes = await prisma.fax.findMany({
    orderBy: { receivedAt: "desc" },
    take: 25,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
          <RadioTower className="h-3.5 w-3.5" />
          Admin integrations
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Workflow Integrations</h1>
        <p className="mt-1 text-sm muted">V1 keeps noisy HL7/FHIR and inbound fax out of selling flow.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Calendar sync" badge={<Badge tone="success">Active</Badge>}>
          <a href="/api/calendar/me" className="btn-primary mt-3 inline-flex px-3 py-2 text-sm">
            Download ICS
          </a>
        </Card>
        <Card title="On-call SMS" badge={<Badge tone="success">Active</Badge>}>
          <code className="mt-2 block break-all rounded bg-[var(--surface-muted)] p-2 text-xs">POST /api/patients/:id/alerts</code>
        </Card>
        <Card title="e-Fax inbound" badge={<Badge>Parked for v1</Badge>}>
          <p className="text-sm muted">Endpoint remains gated, but product UI no longer sells this as pilot scope.</p>
        </Card>
        <Card title="HL7/FHIR" badge={<Badge>Parked for v1</Badge>}>
          <p className="text-sm muted">FHIR routes stay behind feature gate for later integrations.</p>
        </Card>
      </div>

      <div className="panel overflow-x-auto">
        <div className="border-b hairline px-4 py-3">
          <h2 className="font-semibold">Recent inbound faxes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b hairline bg-[var(--surface-muted)]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide muted">
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {faxes.map((fax) => (
              <tr key={fax.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3 font-mono text-xs muted">{fax.receivedAt.toLocaleString()}</td>
                <td className="px-4 py-3">{fax.from ?? "-"}</td>
                <td className="px-4 py-3">
                  {fax.patient ? `${fax.patient.firstName} ${fax.patient.lastName} (${fax.patient.mrn})` : "Unlinked"}
                </td>
                <td className="px-4 py-3">
                  <Badge>{fax.status ?? "-"}</Badge>
                </td>
                <td className="px-4 py-3">{fax.pages ?? "-"}</td>
              </tr>
            ))}
            {faxes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6">
                  <EmptyState icon={Inbox} title="No inbound faxes" hint="Fax remains parked for v1 pilot scope." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, badge, children }: { title: string; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="surface-card p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge}
      </div>
      {children}
    </article>
  );
}
