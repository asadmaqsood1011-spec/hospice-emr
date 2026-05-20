import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl shadow-lg p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-stone-100 text-slate-700 flex items-center justify-center text-2xl font-semibold">
            404
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
          <p className="text-sm text-slate-600 mt-2">
            That page doesn&apos;t exist, has been moved, or you don&apos;t have access.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/patients"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800"
          >
            Patients
          </Link>
        </div>
      </div>
    </div>
  );
}
