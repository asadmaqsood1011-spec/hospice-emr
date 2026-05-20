import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList, Pill } from "lucide-react";
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
        <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
          <Pill className="h-3.5 w-3.5" />
          Medication ledger
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Controlled Substances</h1>
        <p className="mt-1 text-sm muted">Count, administer, receive, and waste events are audit logged.</p>
      </div>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-sm font-semibold">New ledger entry</h2>
        <ControlledSubstanceForm
          meds={meds.map((m) => ({
            id: m.id,
            patientId: m.patient.id,
            label: `${m.patient.lastName}, ${m.patient.firstName} (${m.patient.mrn}) - ${m.name} ${m.dose}`,
          }))}
        />
      </section>

      <section className="panel">
        <div className="border-b hairline px-5 py-3">
          <h2 className="text-sm font-semibold">Recent ledger</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {logs.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={ClipboardList} title="No ledger events" hint="Controlled-substance events appear here after count, waste, receive, or administer actions." />
            </div>
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
      <div className="font-mono text-xs muted">{new Date(log.ts).toLocaleString()}</div>
      <div>
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          <Badge tone="info">{String(metadata.eventType ?? "event").toUpperCase()}</Badge>
          <span>{String(metadata.medicationName ?? "Medication")}</span>
        </div>
        <div className="muted">
          {log.patient ? `${log.patient.lastName}, ${log.patient.firstName} (${log.patient.mrn})` : "No patient"} - Qty {String(metadata.quantity ?? "-")}
        </div>
      </div>
      <div className="muted">{log.user ? `${log.user.name} (${log.user.role})` : "System"}</div>
      <div className="muted">Witness: {String(metadata.witness ?? "none")}</div>
    </div>
  );
}
