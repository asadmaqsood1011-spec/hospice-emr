"use client";

import { useActionState } from "react";
import { admitPatient, type AdmitState } from "./actions";

export function AdmitForm() {
  const [state, action, pending] = useActionState<AdmitState, FormData>(admitPatient, undefined);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </div>
      )}

      <Section title="Demographics">
        <Grid>
          <Field label="MRN *" name="mrn" placeholder="HSP-1006" required err={state?.fieldErrors?.mrn} />
          <Field label="Date of Birth *" name="dob" type="date" required err={state?.fieldErrors?.dob} />
          <Field label="First Name *" name="firstName" required err={state?.fieldErrors?.firstName} />
          <Field label="Last Name *" name="lastName" required err={state?.fieldErrors?.lastName} />
          <Select label="Sex" name="sex" options={["", "F", "M", "X"]} />
          <Field label="Phone" name="phone" type="tel" />
          <Field label="Address" name="address" full />
        </Grid>
      </Section>

      <Section title="Clinical">
        <Grid>
          <Field label="Primary Diagnosis" name="primaryDx" placeholder="e.g. Metastatic pancreatic cancer" full />
          <Field label="ICD-10" name="primaryDxIcd" placeholder="C25.9" />
          <Field label="Prognosis (months)" name="prognosisMo" type="number" placeholder="6" />
          <Select
            label="Code Status *"
            name="codeStatus"
            required
            options={["FULL", "DNR", "DNI", "DNR_DNI", "COMFORT_ONLY"]}
            labelFn={(v) => v.replace(/_/g, "/")}
          />
          <Select
            label="Level of Care *"
            name="levelOfCare"
            required
            options={["ROUTINE", "CONTINUOUS", "INPATIENT_RESPITE", "GENERAL_INPATIENT"]}
            labelFn={(v) => v.replace(/_/g, " ")}
          />
        </Grid>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-800">
          <input type="checkbox" name="consentOnFile" className="h-4 w-4 accent-teal-700" />
          Patient consent on file
        </label>
      </Section>

      <Section title="Primary Caregiver (optional)">
        <Grid>
          <Field label="Name" name="caregiverName" />
          <Field label="Relationship" name="caregiverRelationship" placeholder="Spouse, Daughter, POA..." />
          <Field label="Phone" name="caregiverPhone" type="tel" />
        </Grid>
      </Section>

      <div className="flex justify-end gap-3">
        <a href="/patients" className="btn-secondary px-4 py-2.5 text-sm">
          Cancel
        </a>
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
          {pending ? "Admitting..." : "Admit Patient"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--primary)]">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  full,
  err,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  full?: boolean;
  err?: string[];
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      {err && <p className="mt-1 text-xs text-red-700">{err.join(", ")}</p>}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required,
  labelFn,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
  labelFn?: (v: string) => string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <select
        name={name}
        required={required}
        className="w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "" ? "--" : labelFn ? labelFn(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
