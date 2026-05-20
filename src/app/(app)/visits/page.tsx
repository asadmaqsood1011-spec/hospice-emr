import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { VisitScheduler } from "@/components/visit-scheduler";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { endVisit, startVisit } from "./actions";

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; days?: string }>;
}) {
  const session = await auth();
  const { type, days } = await searchParams;

  const sinceDays = Number(days ?? "7");
  const since = new Date(Date.now() - sinceDays * 86400000);

  const [patients, visits] = await Promise.all([
    prisma.patient.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, mrn: true },
    }),
    prisma.visit.findMany({
      where: {
        OR: [{ startedAt: { gte: since } }, { scheduledFor: { gte: since } }],
        ...(type ? { type: type as never } : {}),
      },
      orderBy: [{ scheduledFor: "asc" }, { startedAt: "desc" }],
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        provider: { select: { name: true, role: true } },
        note: { select: { signed: true, assessment: true } },
      },
      take: 100,
    }),
  ]);

  await audit({
    userId: session?.user.id,
    action: "READ",
    resource: "VisitList",
    metadata: { count: visits.length, days: sinceDays, type },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            <CalendarDays className="h-3.5 w-3.5" />
            Visit workflow
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Visits</h1>
          <p className="mt-1 text-sm muted">
            {visits.length} visit{visits.length === 1 ? "" : "s"} in last {sinceDays} days
          </p>
        </div>
      </div>

      <VisitScheduler
        patients={patients.map((p) => ({
          id: p.id,
          label: `${p.lastName}, ${p.firstName} (${p.mrn})`,
        }))}
      />

      <form className="panel flex flex-wrap gap-2 p-3">
        <select name="type" defaultValue={type ?? ""} className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
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
        <select name="days" defaultValue={String(sinceDays)} className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
          <option value="1">Last 24h</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Filter
        </button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b hairline bg-[var(--surface-muted)]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide muted">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visits.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3 font-mono text-xs muted">
                  {new Date(v.scheduledFor ?? v.startedAt).toLocaleString()}
                  {v.durationMin && <div>{v.durationMin} min</div>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/patients/${v.patient.id}`} className="font-semibold text-[var(--primary)] hover:underline">
                    {v.patient.firstName} {v.patient.lastName}
                  </Link>
                  <div className="font-mono text-xs muted">{v.patient.mrn}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge>{v.type.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  {v.provider.name}
                  <span className="text-xs muted"> ({v.provider.role})</span>
                </td>
                <td className="max-w-md truncate px-4 py-3 muted">{v.note?.assessment ?? "--"}</td>
                <td className="px-4 py-3">
                  <VisitStatus visit={v} />
                </td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6">
                  <EmptyState icon={Search} title="No visits in selected window" hint="Change filters or schedule a visit." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitStatus({
  visit,
}: {
  visit: {
    id: string;
    scheduledFor: Date | null;
    endedAt: Date | null;
    signed: boolean;
    note: { signed: boolean; assessment: string | null } | null;
  };
}) {
  const status = statusFor(visit);
  if (status === "scheduled") {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge tone="info">Scheduled</Badge>
        <form action={startVisit}>
          <input type="hidden" name="visitId" value={visit.id} />
          <button type="submit" className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
            Start
          </button>
        </form>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge tone="warning">Active</Badge>
        <form action={endVisit}>
          <input type="hidden" name="visitId" value={visit.id} />
          <button type="submit" className="rounded-md border hairline bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold">
            End
          </button>
        </form>
      </div>
    );
  }
  if (visit.signed || visit.note?.signed) return <Badge tone="success">Signed</Badge>;
  if (visit.note) return <Badge tone="warning">Draft</Badge>;
  return <Badge>No note</Badge>;
}

function statusFor(v: { scheduledFor: Date | null; endedAt: Date | null; note: unknown }) {
  if (v.endedAt || v.note) return "complete";
  if (v.scheduledFor && v.scheduledFor.getTime() >= Date.now()) return "scheduled";
  return "active";
}
