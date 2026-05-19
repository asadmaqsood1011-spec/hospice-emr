"use client";

import { useEffect, useState } from "react";
import { addAllergy, addCaregiver, addMedication, addScores } from "@/app/(app)/patients/[id]/actions";

type RxResult = {
  rxcui: string;
  name: string;
};

export function PatientClinicalForms({
  patientId,
  canAddMedication,
}: {
  patientId: string;
  canAddMedication: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <ScoreForm patientId={patientId} />
      <AllergyForm patientId={patientId} />
      <CaregiverForm patientId={patientId} />
      {canAddMedication ? <MedicationForm patientId={patientId} /> : null}
    </div>
  );
}

function ScoreForm({ patientId }: { patientId: string }) {
  return (
    <form action={addScores} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Add Scores</h2>
      <div className="grid grid-cols-2 gap-2">
        <Field name="pps" label="PPS" type="number" min={0} max={100} step={10} placeholder="40" />
        <Field name="pain" label="Pain" type="number" min={0} max={10} placeholder="0" />
        <Field name="tiredness" label="Tired" type="number" min={0} max={10} placeholder="0" />
        <Field name="drowsiness" label="Drowsy" type="number" min={0} max={10} placeholder="0" />
        <Field name="nausea" label="Nausea" type="number" min={0} max={10} placeholder="0" />
        <Field name="appetite" label="Appetite" type="number" min={0} max={10} placeholder="0" />
        <Field name="shortBreath" label="SOB" type="number" min={0} max={10} placeholder="0" />
        <Field name="wellbeing" label="Wellbeing" type="number" min={0} max={10} placeholder="0" />
        <Field name="depression" label="Depress." type="number" min={0} max={10} placeholder="0" />
        <Field name="anxiety" label="Anxiety" type="number" min={0} max={10} placeholder="0" />
      </div>
      <Submit>Add Scores</Submit>
    </form>
  );
}

function AllergyForm({ patientId }: { patientId: string }) {
  return (
    <form action={addAllergy} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Add Allergy</h2>
      <Field name="substance" label="Substance" required placeholder="Penicillin" />
      <Field name="reaction" label="Reaction" placeholder="Rash" />
      <Select name="severity" label="Severity" options={["", "mild", "moderate", "severe"]} />
      <Submit>Add Allergy</Submit>
    </form>
  );
}

function CaregiverForm({ patientId }: { patientId: string }) {
  return (
    <form action={addCaregiver} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Add Caregiver</h2>
      <Field name="name" label="Name" required placeholder="Sarah Whitfield" />
      <Field name="relationship" label="Relationship" placeholder="Daughter" />
      <Field name="phone" label="Phone" type="tel" placeholder="705-555-0125" />
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input type="checkbox" name="isPrimary" className="w-4 h-4 accent-teal-700" />
        Primary
      </label>
      <Submit>Add Caregiver</Submit>
    </form>
  );
}

function MedicationForm({ patientId }: { patientId: string }) {
  const [q, setQ] = useState("");
  const [rxcui, setRxcui] = useState("");
  const [results, setResults] = useState<RxResult[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const id = window.setTimeout(async () => {
      const res = await fetch(`/api/rxnorm?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 250);
    return () => window.clearTimeout(id);
  }, [q]);

  function pick(item: RxResult) {
    setQ(item.name);
    setRxcui(item.rxcui);
    setResults([]);
  }

  return (
    <form action={addMedication} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="rxcui" value={rxcui} />
      <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Add Medication</h2>
      <div className="relative">
        <Field name="name" label="Medication" required value={q} onChange={setQ} placeholder="Morphine sulfate" />
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg overflow-hidden">
            {results.slice(0, 6).map((item) => (
              <button
                key={item.rxcui}
                type="button"
                onClick={() => pick(item)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-teal-50"
              >
                <span className="font-semibold">{item.name}</span>
                <span className="ml-2 text-xs font-mono text-slate-500">{item.rxcui}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field name="dose" label="Dose" required placeholder="5mg" />
        <Field name="route" label="Route" placeholder="PO" />
        <Field name="frequency" label="Freq." placeholder="q4h PRN" />
        <Field name="indication" label="For" placeholder="Pain" />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input type="checkbox" name="controlled" className="w-4 h-4 accent-teal-700" />
        Controlled
      </label>
      <Submit>Add Medication</Submit>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700"
      />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <select name={name} className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900">
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "-"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800">
      {children}
    </button>
  );
}
