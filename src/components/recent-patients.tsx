"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecentPatient = {
  id: string;
  name: string;
  mrn: string;
  ts: number;
};

const KEY = "hospice-emr-recent-patients";

export function RecentPatientTracker({ patient }: { patient: Omit<RecentPatient, "ts"> }) {
  useEffect(() => {
    const current = read();
    const next = [
      { ...patient, ts: Date.now() },
      ...current.filter((p) => p.id !== patient.id),
    ].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("recent-patients-changed"));
  }, [patient]);

  return null;
}

export function RecentPatientsNav() {
  const [items, setItems] = useState<RecentPatient[]>([]);

  useEffect(() => {
    const refresh = () => setItems(read());
    refresh();
    window.addEventListener("recent-patients-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("recent-patients-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-1 text-xs">
      <span className="text-slate-500 font-semibold px-1">Recent</span>
      {items.slice(0, 3).map((p) => (
        <Link
          key={p.id}
          href={`/patients/${p.id}`}
          className="font-semibold text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-lg"
          title={`${p.name} (${p.mrn})`}
        >
          {p.name.split(" ").at(-1)}
        </Link>
      ))}
    </div>
  );
}

function read(): RecentPatient[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as RecentPatient[];
  } catch {
    return [];
  }
}
