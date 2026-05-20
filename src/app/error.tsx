"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Strip stack; send to Sentry/equivalent in prod.
    console.error("App error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl shadow-lg p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-2xl">
            !
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600 mt-2">
            The error has been logged. If this keeps happening, contact your administrator
            {error.digest ? (
              <>
                {" "}and include this reference:{" "}
                <code className="font-mono text-xs text-slate-700 bg-stone-100 px-1.5 py-0.5 rounded">
                  {error.digest}
                </code>
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => history.back()}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-stone-300 text-slate-800 hover:bg-stone-100"
          >
            Go back
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
