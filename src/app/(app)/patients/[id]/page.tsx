import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { fullName, ageFrom } from "@/lib/utils";
import { ESASChart } from "@/components/esas-chart";
import { PPSChart } from "@/components/pps-chart";
import { VoiceNoteRecorder } from "@/components/voice-note-recorder";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      allergies: true,
      meds: { where: { discontinuedAt: null }, orderBy: { startedAt: "desc" } },
      contacts: { orderBy: { isPrimary: "desc" } },
      esasScores: { orderBy: { recordedAt: "asc" }, take: 30 },
      ppsScores: { orderBy: { recordedAt: "asc" }, take: 30 },
      clinicalNotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });

  if (!patient) notFound();

  await audit({
    userId: session?.user.id,
    patientId: patient.id,
    action: "READ",
    resource: "Patient",
    resourceId: patient.id,
  });

  const latestEsas = patient.esasScores.at(-1);
  const latestPps = patient.ppsScores.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/patients" className="text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline">
            ← All patients
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">{fullName(patient)}</h1>
          <p className="text-sm font-medium text-slate-700 mt-1">
            MRN <span className="font-mono">{patient.mrn}</span> · {ageFrom(patient.dob)}y · {patient.sex ?? "—"} ·{" "}
            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">{patient.codeStatus.replace(/_/g, "/")}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="#voice-recorder"
            className="bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 shadow-sm transition-colors"
          >
            🎤 Record Note
          </a>
        </div>
      </div>

      {patient.lockbox && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          🔒 Lockbox patient — access requires break-glass reason
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overview card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Overview
          </h2>
          <Row label="Primary Dx" value={patient.primaryDx ?? "—"} />
          <Row label="ICD-10" value={patient.primaryDxIcd ?? "—"} mono />
          <Row label="Level of Care" value={patient.levelOfCare.replace(/_/g, " ")} />
          <Row label="Admitted" value={new Date(patient.admittedAt).toLocaleDateString()} />
          <Row
            label="Prognosis"
            value={patient.prognosisMo ? `${patient.prognosisMo} months` : "—"}
          />
          <Row label="Consent" value={patient.consentOnFile ? "✓ On file" : "Missing"} />
        </div>

        {/* Latest scores */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Latest Scores
          </h2>
          {latestPps ? (
            <div>
              <div className="text-xs text-slate-500">PPS</div>
              <div className="text-3xl font-semibold">{latestPps.score}%</div>
              <div className="text-xs text-slate-400">
                {new Date(latestPps.recordedAt).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">No PPS recorded</div>
          )}
          {latestEsas && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-1">ESAS (latest)</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <ESASCell label="Pain" v={latestEsas.pain} />
                <ESASCell label="Fatigue" v={latestEsas.tiredness} />
                <ESASCell label="Nausea" v={latestEsas.nausea} />
                <ESASCell label="Drowsy" v={latestEsas.drowsiness} />
                <ESASCell label="Appetite" v={latestEsas.appetite} />
                <ESASCell label="SOB" v={latestEsas.shortBreath} />
                <ESASCell label="Dep." v={latestEsas.depression} />
                <ESASCell label="Anx." v={latestEsas.anxiety} />
                <ESASCell label="Well." v={latestEsas.wellbeing} />
              </div>
            </div>
          )}
        </div>

        {/* Allergies + Caregivers */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">
              Allergies
            </h2>
            {patient.allergies.length === 0 ? (
              <div className="text-sm text-slate-400">NKDA</div>
            ) : (
              <ul className="text-sm space-y-1">
                {patient.allergies.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.substance}</span>
                    <span className="text-xs text-red-600">{a.severity ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">
              Caregivers
            </h2>
            {patient.contacts.length === 0 ? (
              <div className="text-sm text-slate-400">None on file</div>
            ) : (
              <ul className="text-sm space-y-1">
                {patient.contacts.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.name}</span>
                    {c.relationship && (
                      <span className="text-slate-500"> · {c.relationship}</span>
                    )}
                    {c.isPrimary && (
                      <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      {patient.esasScores.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">ESAS Trend</h2>
            <ESASChart data={patient.esasScores} />
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">PPS Trend</h2>
            <PPSChart data={patient.ppsScores} />
          </div>
        </div>
      )}

      {/* Voice note recorder */}
      <div id="voice-recorder" className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 scroll-mt-20">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          🎤 Voice Note → SOAP
        </h2>
        <VoiceNoteRecorder patientId={patient.id} />
      </div>

      {/* Medications */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Active Medications ({patient.meds.length})
        </h2>
        {patient.meds.length === 0 ? (
          <div className="text-sm text-slate-400">None</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {patient.meds.map((m) => (
              <li key={m.id} className="py-2 text-sm flex justify-between items-center">
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-slate-500">
                    {" "}
                    {m.dose}
                    {m.route ? ` ${m.route}` : ""}
                    {m.frequency ? ` ${m.frequency}` : ""}
                  </span>
                  {m.indication && (
                    <span className="text-xs text-slate-400"> — {m.indication}</span>
                  )}
                </div>
                {m.controlled && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    Controlled
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent notes */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Notes</h2>
        {patient.clinicalNotes.length === 0 ? (
          <div className="text-sm text-slate-400">No notes yet</div>
        ) : (
          <ul className="space-y-3">
            {patient.clinicalNotes.map((n) => (
              <li key={n.id} className="border-l-2 border-slate-200 pl-3">
                <div className="text-xs text-slate-500 flex gap-2">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  <span>·</span>
                  <span>
                    {n.author.name} ({n.author.role})
                  </span>
                  {n.signed && <span className="text-green-600">· ✓ signed</span>}
                </div>
                {n.assessment && (
                  <div className="text-sm mt-1">
                    <span className="font-medium">A:</span> {n.assessment}
                  </div>
                )}
                {n.plan && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">P:</span> {n.plan}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className={mono ? "font-mono text-xs text-slate-900" : "text-slate-900 font-semibold"}>{value}</span>
    </div>
  );
}

function ESASCell({ label, v }: { label: string; v: number }) {
  const color =
    v >= 7 ? "bg-red-100 text-red-700" : v >= 4 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return (
    <div className={`${color} rounded px-1.5 py-1 text-center`}>
      <div className="text-[10px] uppercase tracking-wider opacity-75">{label}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}
