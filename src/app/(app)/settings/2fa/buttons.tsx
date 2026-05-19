"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { enable2fa, disable2fa } from "./actions";

export function Enable2FA() {
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await enable2fa(fd);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("2FA enabled");
            window.location.reload();
          }
        })
      }
      className="flex gap-2"
    >
      <input
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="123456"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg w-32 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
      />
      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {pending ? "Verifying..." : "Enable 2FA"}
      </button>
    </form>
  );
}

export function Disable2FA() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          if (!confirm("Disable 2FA? You'll only need your password to log in.")) return;
          const res = await disable2fa();
          if (res?.error) toast.error(res.error);
          else {
            toast.success("2FA disabled");
            window.location.reload();
          }
        })
      }
      disabled={pending}
      className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Disabling..." : "Disable 2FA"}
    </button>
  );
}
