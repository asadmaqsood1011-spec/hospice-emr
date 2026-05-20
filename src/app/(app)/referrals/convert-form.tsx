"use client";

import { useActionState } from "react";
import { convertReferralToPatient, type ReferralFormState } from "./actions";

export function ConvertReferralForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState<ReferralFormState, FormData>(convertReferralToPatient, undefined);

  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input type="hidden" name="referralId" value={referralId} />
      <input name="mrn" required placeholder="MRN" className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm" />
      <select name="codeStatus" required className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
        {["DNR", "DNR_DNI", "COMFORT_ONLY", "FULL", "DNI"].map((v) => <option key={v} value={v}>{v.replace(/_/g, "/")}</option>)}
      </select>
      <select name="levelOfCare" required className="rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
        {["ROUTINE", "CONTINUOUS", "INPATIENT_RESPITE", "GENERAL_INPATIENT"].map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
      </select>
      <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{pending ? "Admitting..." : "Admit"}</button>
      {state?.error && <div className="text-sm font-semibold text-red-700 sm:col-span-4">{state.error}</div>}
    </form>
  );
}
