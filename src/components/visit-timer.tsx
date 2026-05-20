"use client";

import { useEffect, useMemo, useState } from "react";
import { TimerReset } from "lucide-react";

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
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide soft">
            <TimerReset className="h-4 w-4 text-[var(--primary)]" />
            Visit timer
          </h2>
          <div key={elapsed} className="timer-digits mt-1 text-3xl font-bold tabular-nums">
            {elapsed}
          </div>
        </div>
        {startedAt ? (
          <button type="button" onClick={stop} className="btn-secondary px-3 py-2 text-sm">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} className="btn-primary px-3 py-2 text-sm">
            Start
          </button>
        )}
      </div>
    </div>
  );
}
