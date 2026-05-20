import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
        <h1 className="text-3xl font-bold text-slate-900">On-call Handoff</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">After-hours snapshot: symptoms, PPS, meds, recent note, and handoff comments.</p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Current on-call contacts</h2>
        {onCall.length === 0 ? (
          <div className="text-sm text-slate-500">No users have on-call phone numbers configured.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {onCall.map((u) => (
              <div key={`${u.name}-${u.oncallPhone}`} className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <div className="font-semibold text-slate-900">{u.name}</div>
                <div className="text-slate-600">{u.role} - {u.oncallPhone}</div>
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
            <article key={patient.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/patients/${patient.id}`} className="text-lg font-bold text-slate-900 hover:text-teal-700">
                    {patient.lastName}, {patient.firstName}
                  </Link>
                  <div className="mt-1 text-sm text-slate-600">
                    MRN {patient.mrn} - {patient.codeStatus.replace(/_/g, "/")} - {patient.levelOfCare.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <span className={scoreClass(pain)}>Pain {pain ?? "-"}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">PPS {latestPps?.score ?? "-"}%</span>
                  {patient.lockbox && <span className="rounded bg-red-100 px-2 py-1 text-red-700">Lockbox</span>}
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Active meds</div>
                  <div className="mt-1 text-slate-700">{patient.meds.map((m) => m.name).join(", ") || "None"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest note</div>
                  <div className="mt-1 text-slate-700">{patient.clinicalNotes[0]?.assessment ?? "No recent assessment"}</div>
                </div>
              </div>
              {rows.length > 0 && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  {rows.slice(0, 3).map((row) => {
                    const meta = (row.metadata ?? {}) as Record<string, unknown>;
                    return (
                      <div key={row.id} className="border-b border-slate-200 py-2 last:border-0">
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

function scoreClass(pain: number | undefined) {
  if (pain === undefined) return "rounded bg-slate-100 px-2 py-1 text-slate-700";
  if (pain >= 7) return "rounded bg-red-100 px-2 py-1 text-red-700";
  if (pain >= 4) return "rounded bg-amber-100 px-2 py-1 text-amber-700";
  return "rounded bg-emerald-100 px-2 py-1 text-emerald-700";
}
