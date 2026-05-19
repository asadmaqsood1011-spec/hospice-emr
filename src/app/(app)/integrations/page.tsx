import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const faxes = await prisma.fax.findMany({
    orderBy: { receivedAt: "desc" },
    take: 25,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workflow Integrations</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="e-Fax inbound">
          <code className="block mt-2 text-xs bg-stone-100 rounded p-2 break-all">POST /api/integrations/fax/inbound</code>
        </Card>
        <Card title="HL7/FHIR">
          <code className="block mt-2 text-xs bg-stone-100 rounded p-2 break-all">GET /api/fhir/Patient?name=smith</code>
        </Card>
        <Card title="Calendar sync">
          <a href="/api/calendar/me" className="inline-block mt-3 px-3 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800">
            Download ICS
          </a>
        </Card>
        <Card title="On-call SMS">
          <code className="block mt-2 text-xs bg-stone-100 rounded p-2 break-all">POST /api/patients/:id/alerts</code>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200">
          <h2 className="font-bold text-slate-900">Recent inbound faxes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-wider text-slate-700">
            <tr>
              <th className="text-left px-4 py-2">Received</th>
              <th className="text-left px-4 py-2">From</th>
              <th className="text-left px-4 py-2">Patient</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Pages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {faxes.map((fax) => (
              <tr key={fax.id}>
                <td className="px-4 py-2 font-mono text-xs">{fax.receivedAt.toLocaleString()}</td>
                <td className="px-4 py-2">{fax.from ?? "-"}</td>
                <td className="px-4 py-2">
                  {fax.patient ? `${fax.patient.firstName} ${fax.patient.lastName} (${fax.patient.mrn})` : "Unlinked"}
                </td>
                <td className="px-4 py-2">{fax.status ?? "-"}</td>
                <td className="px-4 py-2">{fax.pages ?? "-"}</td>
              </tr>
            ))}
            {faxes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No inbound faxes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-900 mb-2">{title}</h2>
      {children}
    </div>
  );
}
