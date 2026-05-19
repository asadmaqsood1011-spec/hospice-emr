"use client";

import { useState } from "react";
import { toast } from "sonner";

export function PatientActions({
  patientId,
  isAdmin,
}: {
  patientId: string;
  isAdmin: boolean;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function deletePatient() {
    if (!isAdmin) return;
    if (reason.trim().length < 10) {
      toast.error("Deletion reason must be at least 10 characters");
      return;
    }
    if (!confirm("Soft-delete this patient record? The action is audit-logged.")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Patient deleted with audit trail");
      window.location.href = "/patients";
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendPainAlert() {
    setBusy(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "pain-crisis", message: "Pain crisis follow-up requested" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(data.sent ? "SMS alert sent" : "Alert logged; SMS env not configured");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Chart Actions</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a className="text-center px-3 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800" href={`/api/patients/${patientId}/export?format=pdf`}>
          PDF Export
        </a>
        <a className="text-center px-3 py-2 rounded-lg text-sm font-semibold border border-stone-300 text-slate-800 hover:bg-stone-100" href={`/api/patients/${patientId}/export?format=json`}>
          JSON Export
        </a>
        <a className="text-center px-3 py-2 rounded-lg text-sm font-semibold border border-stone-300 text-slate-800 hover:bg-stone-100" href="/api/calendar/me">
          Calendar ICS
        </a>
        <button type="button" onClick={sendPainAlert} disabled={busy} className="px-3 py-2 rounded-lg text-sm font-semibold border border-amber-300 text-amber-900 hover:bg-amber-50 disabled:opacity-50">
          Pain SMS
        </button>
      </div>

      {isAdmin && (
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="block text-xs font-bold text-red-700 uppercase tracking-wider">Delete Patient</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Reason required for audit trail"
            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-white text-slate-900"
          />
          <button type="button" onClick={deletePatient} disabled={busy || reason.trim().length < 10} className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-red-700 text-white hover:bg-red-800 disabled:opacity-50">
            Delete With Audit
          </button>
        </div>
      )}
    </div>
  );
}
