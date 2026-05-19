import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { fullName, ageFrom } from "@/lib/utils";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;

  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { mrn: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const patients = await prisma.patient.findMany({
    where,
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      dob: true,
      status: true,
      codeStatus: true,
      levelOfCare: true,
      primaryDx: true,
      admittedAt: true,
    },
  });

  await audit({
    userId: session?.user.id,
    action: "READ",
    resource: "PatientList",
    metadata: { count: patients.length, search: q ?? null },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">{patients.length} on service</p>
        </div>
        <Link
          href="/patients/new"
          className="bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 shadow-sm transition-colors"
        >
          + Admit Patient
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or MRN..."
          className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
        />
      </form>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 border-b-2 border-stone-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-700 font-bold">
              <th className="px-4 py-3">MRN</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Primary Dx</th>
              <th className="px-4 py-3">Level of Care</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-teal-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.mrn}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${p.id}`}
                    className="font-semibold text-teal-800 hover:text-teal-600 hover:underline"
                  >
                    {fullName(p)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-800 font-medium">{ageFrom(p.dob)}</td>
                <td className="px-4 py-3 text-slate-800">{p.primaryDx ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium bg-stone-200 text-slate-800 px-2 py-1 rounded">
                    {p.levelOfCare.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded">
                    {p.codeStatus.replace(/_/g, "/")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : status === "DECEASED"
        ? "bg-stone-300 text-slate-800 border border-stone-400"
        : "bg-amber-100 text-amber-800 border border-amber-200";
  return <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>{status}</span>;
}
