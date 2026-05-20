import { ClipboardCheck, FileSignature, UsersRound } from "lucide-react";
import type { Medication } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { createIdgReview, createMedicationReconciliation, createPlanOfCare } from "@/app/(app)/patients/[id]/actions";

type Plan = {
  id: string;
  status: string;
  certificationStart: Date;
  certificationEnd: Date;
  primaryDiagnosis: string;
  goals: string;
};

type Idg = {
  id: string;
  meeting: { title: string; meetingAt: Date; status: string };
  decisions: string;
  actionItems: string | null;
};

type MedRec = {
  id: string;
  reason: string;
  source: string | null;
  completedAt: Date | null;
  items: { action: string }[];
};

export function IncumbentWorkflows({
  patientId,
  patientDx,
  meds,
  plans,
  idgItems,
  medRecs,
}: {
  patientId: string;
  patientDx: string | null;
  meds: Pick<Medication, "id" | "name" | "dose" | "frequency">[];
  plans: Plan[];
  idgItems: Idg[];
  medRecs: MedRec[];
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <WorkflowPanel icon={<FileSignature className="h-4 w-4" />} title="CMS 485 / plan of care">
        <LatestPlan plans={plans} />
        <form action={createPlanOfCare} className="mt-4 space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <Grid>
            <Field name="certificationStart" label="Cert start" type="date" required />
            <Field name="certificationEnd" label="Cert end" type="date" required />
          </Grid>
          <Field name="primaryDiagnosis" label="Primary diagnosis" defaultValue={patientDx ?? ""} required />
          <Text name="goals" label="Goals" placeholder="Comfort goals, symptom control, family support..." />
          <Text name="interventions" label="Interventions" placeholder="Skilled nursing, medication review, social work..." />
          <Grid>
            <Field name="disciplines" label="Disciplines" placeholder="RN, MD, SW, Chaplain, Aide" required />
            <Field name="visitFrequency" label="Visit frequency" placeholder="RN 2x/week, aide 3x/week" required />
          </Grid>
          <Field name="physicianName" label="Physician" />
          <Submit label="Create plan" />
        </form>
      </WorkflowPanel>

      <WorkflowPanel icon={<UsersRound className="h-4 w-4" />} title="IDG agenda + decisions">
        <LatestIdg items={idgItems} />
        <form action={createIdgReview} className="mt-4 space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <Grid>
            <Field name="title" label="Meeting title" defaultValue="Weekly IDG Review" required />
            <Field name="meetingAt" label="Meeting date" type="date" required />
          </Grid>
          <Field name="attendees" label="Attendees" placeholder="RN, MD, SW, Chaplain..." />
          <Text name="disciplineUpdates" label="Discipline updates" placeholder="RN/MD/SW/Chaplain updates..." />
          <Text name="decisions" label="Decisions" placeholder="Care plan decisions, recert prompts..." />
          <Text name="actionItems" label="Action items" placeholder="Owner + next step + due date" required={false} />
          <Submit label="Sign IDG review" />
        </form>
      </WorkflowPanel>

      <WorkflowPanel icon={<ClipboardCheck className="h-4 w-4" />} title="Medication reconciliation">
        <LatestMedRec recs={medRecs} />
        <form action={createMedicationReconciliation} className="mt-4 space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <Grid>
            <Field name="reason" label="Reason" placeholder="Admit, transfer, discharge, change" required />
            <Field name="source" label="Source" placeholder="Bottle review, MAR, pharmacy..." />
          </Grid>
          <div className="space-y-2">
            {meds.length === 0 ? (
              <p className="rounded-lg border hairline bg-[var(--surface-muted)] px-3 py-2 text-sm muted">No active meds to reconcile.</p>
            ) : (
              meds.map((med) => (
                <div key={med.id} className="rounded-lg border hairline bg-[var(--surface)] p-3">
                  <div className="text-sm font-bold">{med.name} <span className="muted">{med.dose}</span></div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr]">
                    <select name={`action-${med.id}`} className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
                      {["CONTINUE", "CHANGE", "DISCONTINUE", "NEEDS_REVIEW"].map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
                    </select>
                    <input name={`reason-${med.id}`} placeholder="Reason / discrepancy" className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm" />
                  </div>
                </div>
              ))
            )}
          </div>
          <Text name="notes" label="Reconciliation note" placeholder="Unresolved discrepancies, caregiver report, pharmacy follow-up..." required={false} />
          <Submit label="Complete med rec" />
        </form>
      </WorkflowPanel>
    </section>
  );
}

function WorkflowPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">{icon}</span>
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LatestPlan({ plans }: { plans: Plan[] }) {
  const plan = plans[0];
  if (!plan) return <p className="mt-4 text-sm muted">No plan of care yet.</p>;
  return (
    <div className="mt-4 rounded-lg border hairline bg-[var(--surface-muted)] p-3 text-sm">
      <Badge tone={plan.status === "SIGNED" ? "success" : "info"}>{plan.status}</Badge>
      <div className="mt-2 font-semibold">{plan.primaryDiagnosis}</div>
      <div className="muted">{new Date(plan.certificationStart).toLocaleDateString()} - {new Date(plan.certificationEnd).toLocaleDateString()}</div>
      <div className="mt-1 line-clamp-2">{plan.goals}</div>
    </div>
  );
}

function LatestIdg({ items }: { items: Idg[] }) {
  const item = items[0];
  if (!item) return <p className="mt-4 text-sm muted">No IDG decision recorded.</p>;
  return (
    <div className="mt-4 rounded-lg border hairline bg-[var(--surface-muted)] p-3 text-sm">
      <Badge tone="success">{item.meeting.status}</Badge>
      <div className="mt-2 font-semibold">{item.meeting.title}</div>
      <div className="muted">{new Date(item.meeting.meetingAt).toLocaleDateString()}</div>
      <div className="mt-1 line-clamp-2">{item.decisions}</div>
    </div>
  );
}

function LatestMedRec({ recs }: { recs: MedRec[] }) {
  const rec = recs[0];
  if (!rec) return <p className="mt-4 text-sm muted">No medication reconciliation yet.</p>;
  return (
    <div className="mt-4 rounded-lg border hairline bg-[var(--surface-muted)] p-3 text-sm">
      <Badge tone="success">COMPLETED</Badge>
      <div className="mt-2 font-semibold">{rec.reason}</div>
      <div className="muted">{rec.completedAt ? new Date(rec.completedAt).toLocaleDateString() : "No date"} - {rec.items.length} meds reviewed</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({ name, label, type = "text", placeholder, defaultValue, required }: { name: string; label: string; type?: string; placeholder?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 font-normal" />
    </label>
  );
}

function Text({ name, label, placeholder, required = true }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <textarea name={name} rows={3} placeholder={placeholder} required={required} className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 font-normal" />
    </label>
  );
}

function Submit({ label }: { label: string }) {
  return <button type="submit" className="btn-primary w-full px-4 py-2.5 text-sm">{label}</button>;
}
