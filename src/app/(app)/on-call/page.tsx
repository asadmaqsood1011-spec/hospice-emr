import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PhoneCall, Users } from "lucide-react";
import { HandoffForm } from "./handoff-form";

export default async function OnCallPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [onCall, patients, handoffs] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, oncallPhone: { not: null } },
      select: { name: true, role: true, oncallPhone: true },
      orderBy: { role: "asc" },
    }),
    prisma.patient.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        meds: { where: { discontinuedAt: null }, take: 6 },
        esasScores: { orderBy: { recordedAt: "desc" }, take: 1 },
        ppsScores: { orderBy: { recordedAt: "desc" }, take: 1 },
        clinicalNotes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ lockbox: "desc" }, { lastName: "asc" }],
      take: 30,
    }),
    prisma.auditLog.findMany({
      where: { resource: "OnCallHandoff" },
      orderBy: { ts: "desc" },
      take: 100,
      include: { user: { select: { name: true, role: true } } },
    }),
  ]);

  const handoffByPatient = new Map<string, typeof handoffs>();
  for (const h of handoffs) {
    if (!h.patientId) continue;
    handoffByPatient.set(h.patientId, [...(handoffByPatient.get(h.patientId) ?? []), h]);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
          <PhoneCall className="h-3.5 w-3.5" />
          After-hours board
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">On-call Handoff</h1>
        <p className="mt-1 text-sm muted">After-hours snapshot: symptoms, PPS, meds, recent note, and handoff comments.</p>
      </div>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Current on-call contacts</h2>
        {onCall.length === 0 ? (
          <EmptyState icon={Users} title="No on-call contacts" hint="Configure on-call phone numbers on users to populate this board." />
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {onCall.map((u) => (
              <div key={`${u.name}-${u.oncallPhone}`} className="rounded-lg border hairline bg-[var(--surface-muted)] px-3 py-2 text-sm">
                <div className="font-semibold">{u.name}</div>
                <div className="muted">{u.role} - {u.oncallPhone}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        {patients.map((patient) => {
          const latestEsas = patient.esasScores[0];
          const latestPps = patient.ppsScores[0];
          const pain = latestEsas?.pain;
          const rows = handoffByPatient.get(patient.id) ?? [];
          return (
            <article key={patient.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/patients/${patient.id}`} className="text-lg font-bold hover:text-[var(--primary)]">
                    {patient.lastName}, {patient.firstName}
                  </Link>
                  <div className="mt-1 text-sm muted">
                    MRN {patient.mrn} - {patient.codeStatus.replace(/_/g, "/")} - {patient.levelOfCare.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <Badge tone={painTone(pain)}>Pain {pain ?? "-"}</Badge>
                  <Badge>PPS {latestPps?.score ?? "-"}%</Badge>
                  {patient.lockbox && <Badge tone="danger">Lockbox</Badge>}
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider muted">Active meds</div>
                  <div className="mt-1">{patient.meds.map((m) => m.name).join(", ") || "None"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wider muted">Latest note</div>
                  <div className="mt-1">{patient.clinicalNotes[0]?.assessment ?? "No recent assessment"}</div>
                </div>
              </div>
              {rows.length > 0 && (
                <div className="mt-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
                  {rows.slice(0, 3).map((row) => {
                    const meta = (row.metadata ?? {}) as Record<string, unknown>;
                    return (
                      <div key={row.id} className="border-b hairline py-2 last:border-0">
                        <span className="font-semibold">{row.user?.name ?? "Team"}:</span> {String(meta.message ?? "")}
                      </div>
                    );
                  })}
                </div>
              )}
              <HandoffForm patientId={patient.id} />
            </article>
          );
        })}
      </section>
    </div>
  );
}

function painTone(pain: number | undefined) {
  if (pain === undefined) return "neutral";
  if (pain >= 7) return "danger";
  if (pain >= 4) return "warning";
  return "success";
}
