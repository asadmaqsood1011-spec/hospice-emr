"use client";

import { scheduleVisit } from "@/app/(app)/visits/actions";

type PatientOption = {
  id: string;
  label: string;
};

export function VisitScheduler({ patients }: { patients: PatientOption[] }) {
  const defaultDate = new Date(Date.now() + 60 * 60000).toISOString().slice(0, 16);

  return (
    <form action={scheduleVisit} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <label className="block text-xs font-semibold text-slate-700">
        Patient
        <select name="patientId" required className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900">
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Type
        <select name="type" defaultValue="RN_VISIT" className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900">
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
        <input name="scheduledFor" type="datetime-local" required defaultValue={defaultDate} className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900" />
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Location
        <input name="location" placeholder="Home, phone, hospice" className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900" />
      </label>
      <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800">
        Schedule
      </button>
    </form>
  );
}
