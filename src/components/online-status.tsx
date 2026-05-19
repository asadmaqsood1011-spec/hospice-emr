"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { countOutbox } from "@/lib/outbox";
import { flushOutbox } from "@/lib/sync";

export function OnlineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    const refresh = async () => {
      try {
        setPending(await countOutbox());
      } catch {
        // IndexedDB may not be available
      }
    };

    const goOnline = async () => {
      setOnline(true);
      const before = await countOutbox();
      if (before > 0) {
        setSyncing(true);
        const result = await flushOutbox();
        setSyncing(false);
        if (result.synced > 0) {
          toast.success(`Synced ${result.synced} queued note${result.synced === 1 ? "" : "s"}`);
          // Reload so server data shows
          setTimeout(() => window.location.reload(), 1500);
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} note${result.failed === 1 ? "" : "s"} failed to sync`);
        }
      }
      refresh();
    };
    const goOffline = () => setOnline(false);

    refresh();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("outbox-changed", refresh);

    const interval = setInterval(refresh, 10000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("outbox-changed", refresh);
      clearInterval(interval);
    };
  }, []);

  async function manualSync() {
    if (!navigator.onLine) {
      toast.warning("Still offline");
      return;
    }
    setSyncing(true);
    const result = await flushOutbox();
    setSyncing(false);
    setPending(await countOutbox());
    if (result.synced > 0) toast.success(`Synced ${result.synced}`);
    if (result.failed > 0) toast.error(`${result.failed} failed`);
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
          online
            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
            : "bg-amber-100 text-amber-900 border-amber-300"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-600" : "bg-amber-700 animate-pulse"}`}
        />
        {online ? "Online" : "Offline"}
      </span>
      {pending > 0 && (
        <button
          type="button"
          onClick={manualSync}
          disabled={syncing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 disabled:opacity-50"
          title="Click to sync now"
        >
          {syncing ? "Syncing..." : `${pending} pending`}
        </button>
      )}
    </div>
  );
}
