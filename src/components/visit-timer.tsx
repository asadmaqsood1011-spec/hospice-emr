"use client";

import { useEffect, useMemo, useState } from "react";

export function VisitTimer({ patientId }: { patientId: string }) {
  const key = `hospice-emr-visit-timer-${patientId}`;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const refresh = () => {
      const stored = localStorage.getItem(key);
      setStartedAt(stored ? Number(stored) : null);
    };
    refresh();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("visit-timer-changed", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("visit-timer-changed", refresh);
    };
  }, [key]);

  const elapsed = useMemo(() => {
    if (!startedAt) return "00:00";
    const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const min = Math.floor(seconds / 60).toString().padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }, [now, startedAt]);

  function start() {
    const ts = Date.now();
    setStartedAt(ts);
    localStorage.setItem(key, String(ts));
    window.dispatchEvent(new Event("visit-timer-changed"));
  }

  function stop() {
    setStartedAt(null);
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("visit-timer-changed"));
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Visit Timer</h2>
          <div className="mt-1 text-3xl font-mono font-bold text-slate-900">{elapsed}</div>
        </div>
        {startedAt ? (
          <button type="button" onClick={stop} className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} className="px-3 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800">
            Start
          </button>
        )}
      </div>
    </div>
  );
}
