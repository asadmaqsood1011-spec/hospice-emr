import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { breakGlass } from "./actions";

export default async function BreakGlassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, mrn: true, lockbox: true },
  });
  if (!patient) redirect("/patients");
  if (!patient.lockbox) redirect(`/patients/${id}`);

  return (
    <div className="max-w-xl">
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">Lock</span>
          <h1 className="text-2xl font-bold text-red-900">Lockbox Patient</h1>
        </div>
        <p className="text-sm text-red-900 font-medium mb-1">
          {patient.firstName} {patient.lastName}{" "}
          <span className="font-mono text-red-700">({patient.mrn})</span>
        </p>
      </div>

      <form action={breakGlass} className="mt-6 space-y-4">
        <input type="hidden" name="patientId" value={patient.id} />
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            Reason for access
          </label>
          <textarea
            name="reason"
            rows={3}
            required
            minLength={10}
            placeholder="Covering RN, pain crisis, family call..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Link
            href="/patients"
            className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-stone-300 text-slate-800 hover:bg-stone-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 shadow-sm"
          >
            Break Glass
          </button>
        </div>
      </form>
    </div>
  );
}
