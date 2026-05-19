"use client";

import { useActionState } from "react";
import { admitPatient, type AdmitState } from "./actions";

export function AdmitForm() {
  const [state, action, pending] = useActionState<AdmitState, FormData>(admitPatient, undefined);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-300 text-red-800 text-sm rounded-lg px-3 py-2 font-medium">
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
        <label className="flex items-center gap-2 mt-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="consentOnFile" className="w-4 h-4 accent-teal-700" />
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

      <div className="flex gap-3 justify-end">
        <a
          href="/patients"
          className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-stone-300 text-slate-800 hover:bg-stone-100"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 shadow-sm"
        >
          {pending ? "Admitting..." : "Admit Patient"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
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
      <label className="block text-sm font-semibold text-slate-800 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
      />
      {err && <p className="text-xs text-red-700 mt-1">{err.join(", ")}</p>}
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
      <label className="block text-sm font-semibold text-slate-800 mb-1.5">{label}</label>
      <select
        name={name}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "" ? "—" : labelFn ? labelFn(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
