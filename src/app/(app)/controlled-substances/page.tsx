import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { ControlledSubstanceForm } from "./form";

export default async function ControlledSubstancesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "patient.read")) redirect("/patients");

  const meds = await prisma.medication.findMany({
    where: { controlled: true, discontinuedAt: null, patient: { deletedAt: null } },
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
    orderBy: [{ patient: { lastName: "asc" } }, { name: "asc" }],
  });

  const logs = await getControlledLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Controlled Substances</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">Count, administer, receive, and waste events are audit logged.</p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">New ledger entry</h2>
        <ControlledSubstanceForm
          meds={meds.map((m) => ({
            id: m.id,
            patientId: m.patient.id,
            label: `${m.patient.lastName}, ${m.patient.firstName} (${m.patient.mrn}) - ${m.name} ${m.dose}`,
          }))}
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-900">Recent ledger</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {logs.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">No controlled-substance events yet.</div>
          ) : (
            logs.map((log) => <LedgerRow key={log.id} log={log} />)
          )}
        </div>
      </section>
    </div>
  );
}

type LedgerLog = Awaited<ReturnType<typeof getControlledLogs>>[number];

async function getControlledLogs() {
  return prisma.auditLog.findMany({
    where: { resource: "ControlledSubstanceLog" },
    orderBy: { ts: "desc" },
    take: 60,
    include: { user: { select: { name: true, role: true } }, patient: { select: { firstName: true, lastName: true, mrn: true } } },
  });
}

function LedgerRow({ log }: { log: LedgerLog }) {
  const metadata = (log.metadata ?? {}) as Record<string, unknown>;
  return (
    <div className="grid gap-2 px-5 py-3 text-sm md:grid-cols-[160px_1fr_180px_180px]">
      <div className="font-mono text-xs text-slate-500">{new Date(log.ts).toLocaleString()}</div>
      <div>
        <div className="font-semibold text-slate-900">
          {String(metadata.eventType ?? "event").toUpperCase()} - {String(metadata.medicationName ?? "Medication")}
        </div>
        <div className="text-slate-600">
          {log.patient ? `${log.patient.lastName}, ${log.patient.firstName} (${log.patient.mrn})` : "No patient"} - Qty {String(metadata.quantity ?? "-")}
        </div>
      </div>
      <div className="text-slate-600">{log.user ? `${log.user.name} (${log.user.role})` : "System"}</div>
      <div className="text-slate-600">Witness: {String(metadata.witness ?? "none")}</div>
    </div>
  );
}
