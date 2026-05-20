"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { recordHandoff } from "./actions";

export function HandoffForm({ patientId }: { patientId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await recordHandoff(fd);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Handoff added");
            (document.getElementById(`handoff-${patientId}`) as HTMLFormElement | null)?.reset();
          }
        })
      }
      id={`handoff-${patientId}`}
      className="mt-3 flex gap-2"
    >
      <input type="hidden" name="patientId" value={patientId} />
      <input name="message" placeholder="Add on-call handoff note" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <button disabled={pending} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Add
      </button>
    </form>
  );
}
