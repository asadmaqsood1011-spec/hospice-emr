"use client";

import { useActionState } from "react";
import { createReferral, type ReferralFormState } from "./actions";

export function ReferralForm() {
  const [state, action, pending] = useActionState<ReferralFormState, FormData>(createReferral, undefined);

  return (
    <form action={action} className="surface-card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">New referral</h2>
        <p className="mt-1 text-xs muted">Track readiness before converting to admission.</p>
      </div>
      {state?.error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{state.error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name *" name="firstName" required err={state?.fieldErrors?.firstName} />
        <Field label="Last name *" name="lastName" required err={state?.fieldErrors?.lastName} />
        <Field label="DOB" name="dob" type="date" />
        <Field label="Phone" name="phone" type="tel" err={state?.fieldErrors?.phone} />
        <Field label="Referral source" name="source" placeholder="Hospital, physician, family..." />
        <Field label="Payer" name="payer" placeholder="Medicare, Medicaid, private..." />
        <Field label="Primary diagnosis" name="primaryDx" />
        <Field label="ICD-10" name="primaryDxIcd" />
        <Field label="Caregiver name" name="caregiverName" />
        <Field label="Caregiver phone" name="caregiverPhone" type="tel" err={state?.fieldErrors?.caregiverPhone} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Check name="hospiceEligible" label="Eligibility signal" />
        <Check name="consentReady" label="Consent ready" />
        <Check name="documentsReady" label="Docs ready" />
      </div>
      <textarea
        name="notes"
        rows={3}
        placeholder="Missing documents, family concerns, referral notes..."
        className="w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <button type="submit" disabled={pending} className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50">
        {pending ? "Saving..." : "Create referral"}
      </button>
    </form>
  );
}

function Field({ label, name, type = "text", placeholder, required, err }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; err?: string[] }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input name={name} type={type} placeholder={placeholder} required={required} className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 font-normal" />
      {err && <span className="mt-1 block text-xs text-red-700">{err.join(", ")}</span>}
    </label>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
      <input type="checkbox" name={name} className="h-4 w-4 accent-teal-700" />
      {label}
    </label>
  );
}
