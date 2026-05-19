"use client";

import { useState } from "react";

type RxResult = {
  rxcui: string;
  name: string;
};

export function RxNormSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<RxResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rxnorm?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setItems(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder="Search RxNorm meds..."
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
      />
      {loading && <div className="text-xs text-slate-500">Searching...</div>}
      {items.length > 0 && (
        <ul className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
          {items.slice(0, 6).map((item) => (
            <li key={item.rxcui} className="px-3 py-2 text-sm bg-white">
              <span className="font-semibold text-slate-900">{item.name}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">{item.rxcui}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
