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
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{patients.length} on service</p>
        </div>
        <Link
          href="/patients/new"
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
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
          className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">MRN</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Primary Dx</th>
              <th className="px-4 py-3">Level of Care</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.mrn}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${p.id}`}
                    className="font-medium text-slate-900 hover:text-slate-600"
                  >
                    {fullName(p)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{ageFrom(p.dob)}</td>
                <td className="px-4 py-3 text-slate-600">{p.primaryDx ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {p.levelOfCare.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-amber-700">
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
                <td colSpan={7} className="text-center py-8 text-slate-400">
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
      ? "bg-green-100 text-green-700"
      : status === "DECEASED"
        ? "bg-slate-200 text-slate-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{status}</span>;
}
