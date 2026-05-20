"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { recordControlledSubstanceEvent } from "./actions";

type MedOption = {
  id: string;
  label: string;
  patientId: string;
};

export function ControlledSubstanceForm({ meds }: { meds: MedOption[] }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const medId = String(fd.get("medicationId") ?? "");
          const med = meds.find((m) => m.id === medId);
          if (med) fd.set("patientId", med.patientId);
          const res = await recordControlledSubstanceEvent(fd);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Controlled-substance event logged");
            (document.getElementById("controlled-substance-form") as HTMLFormElement | null)?.reset();
          }
        })
      }
      id="controlled-substance-form"
      className="grid gap-3 md:grid-cols-6"
    >
      <input type="hidden" name="patientId" />
      <select name="medicationId" required className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Medication</option>
        {meds.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <select name="eventType" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="count">Count</option>
        <option value="administer">Administer</option>
        <option value="waste">Waste</option>
        <option value="receive">Receive</option>
      </select>
      <input name="quantity" required inputMode="decimal" placeholder="Qty" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <input name="witness" placeholder="Witness" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <button disabled={pending} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Logging..." : "Log"}
      </button>
      <input name="reason" placeholder="Reason / count note" className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </form>
  );
}
