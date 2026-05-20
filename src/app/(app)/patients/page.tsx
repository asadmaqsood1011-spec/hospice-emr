import Link from "next/link";
import { FilePlus2, Search, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { fullName, ageFrom } from "@/lib/utils";
import { SearchShortcut } from "@/components/search-shortcut";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { mrn: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            <Users className="h-3.5 w-3.5" />
            Census command
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm muted">{patients.length} on service</p>
        </div>
        <Link href="/patients/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm shadow-sm">
          <FilePlus2 className="h-4 w-4" />
          Admit Patient
        </Link>
      </div>

      <form className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 soft" />
          <input
            id="patient-search"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or MRN..."
            className="w-full rounded-lg border hairline bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
          />
        </label>
        <span className="hidden text-xs font-semibold uppercase tracking-wide muted sm:inline">Press / or Ctrl K</span>
        <SearchShortcut inputId="patient-search" />
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b hairline bg-[var(--surface-muted)]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide muted">
              <th className="px-4 py-3">MRN</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Primary Dx</th>
              <th className="px-4 py-3">Level of Care</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {patients.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3 font-mono text-xs muted">{p.mrn}</td>
                <td className="px-4 py-3">
                  <Link href={`/patients/${p.id}`} className="font-semibold text-[var(--primary)] hover:underline">
                    {fullName(p)}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{ageFrom(p.dob)}</td>
                <td className="px-4 py-3">{p.primaryDx ?? "--"}</td>
                <td className="px-4 py-3">
                  <Badge>{p.levelOfCare.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="warning">{p.codeStatus.replace(/_/g, "/")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6">
                  <EmptyState
                    icon={Search}
                    title="No patients found"
                    hint="Clear search or admit patient to add them to active census."
                  />
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
  const tone = status === "ACTIVE" ? "success" : status === "DECEASED" ? "neutral" : "warning";
  return <Badge tone={tone}>{status}</Badge>;
}
