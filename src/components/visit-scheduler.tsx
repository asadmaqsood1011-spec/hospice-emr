"use client";

import { scheduleVisit } from "@/app/(app)/visits/actions";

type PatientOption = {
  id: string;
  label: string;
};

export function VisitScheduler({ patients }: { patients: PatientOption[] }) {
  const defaultDate = new Date(Date.now() + 60 * 60000).toISOString().slice(0, 16);

  return (
    <form action={scheduleVisit} className="surface-card grid grid-cols-1 items-end gap-3 p-4 md:grid-cols-5">
      <label className="block text-xs font-semibold text-slate-700">
        Patient
        <select name="patientId" required className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Type
        <select name="type" defaultValue="RN_VISIT" className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm">
          <option value="RN_VISIT">RN visit</option>
          <option value="MD_VISIT">MD visit</option>
          <option value="SW_VISIT">SW visit</option>
          <option value="CHAPLAIN_VISIT">Chaplain visit</option>
          <option value="AIDE_VISIT">Aide visit</option>
          <option value="VOLUNTEER_VISIT">Volunteer visit</option>
          <option value="IDG_MEETING">IDG meeting</option>
          <option value="PHONE">Phone</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Time
        <input name="scheduledFor" type="datetime-local" required defaultValue={defaultDate} className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Location
        <input name="location" placeholder="Home, phone, hospice" className="mt-1 w-full rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      <button type="submit" className="btn-primary px-4 py-2 text-sm">
        Schedule
      </button>
    </form>
  );
}
