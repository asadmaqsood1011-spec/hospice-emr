import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  HeartPulse,
  LockKeyhole,
  Mic,
  Pill,
  ShieldAlert,
  Stethoscope,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { verify as verifyBreakGlass, cookieName as bgCookieName } from "@/lib/break-glass";
import { fullName, ageFrom } from "@/lib/utils";
import { ESASChart } from "@/components/esas-chart";
import { PPSChart } from "@/components/pps-chart";
import { VoiceNoteRecorder } from "@/components/voice-note-recorder";
import { FamilyLetter } from "@/components/family-letter";
import { InteractionsPanel } from "@/components/interactions-panel";
import { PatientActions } from "@/components/patient-actions";
import { PatientClinicalForms } from "@/components/patient-clinical-forms";
import { PhotoDeleteButton } from "@/components/photo-delete-button";
import { PhotoUpload } from "@/components/photo-upload";
import { RecentPatientTracker } from "@/components/recent-patients";
import { SummaryCard } from "@/components/summary-card";
import { VisitTimer } from "@/components/visit-timer";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) redirect("/login");

  // Check soft-delete + break-glass gate
  const lite = await prisma.patient.findUnique({
    where: { id },
    select: { id: true, lockbox: true, deletedAt: true },
  });
  if (!lite) notFound();
  if (lite.deletedAt) notFound();

  let viaBreakGlass = false;
  if (lite.lockbox) {
    const cookieStore = await cookies();
    const c = cookieStore.get(bgCookieName(id))?.value;
    if (!c || !verifyBreakGlass(c, session.user.id, id)) {
      redirect(`/break-glass/${id}`);
    }
    viaBreakGlass = true;
  }

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
      photos: { where: { deletedAt: null }, orderBy: { takenAt: "desc" }, take: 6 },
    },
  });

  if (!patient) notFound();

  await audit({
    userId: session.user.id,
    patientId: patient.id,
    action: "READ",
    resource: "Patient",
    resourceId: patient.id,
    metadata: viaBreakGlass ? { viaBreakGlass: true } : undefined,
  });

  const latestEsas = patient.esasScores.at(-1);
  const latestPps = patient.ppsScores.at(-1);
  const patientName = fullName(patient);

  return (
    <div className="space-y-5">
      <RecentPatientTracker patient={{ id: patient.id, name: patientName, mrn: patient.mrn }} />

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 bg-[var(--surface)] p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href="/patients" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" />
              All patients
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{patientName}</h1>
              <span className="badge badge-warning">{patient.codeStatus.replace(/_/g, "/")}</span>
              {patient.lockbox && (
                <span className="badge badge-danger">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Lockbox
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              MRN <span className="font-mono text-slate-900">{patient.mrn}</span> / {ageFrom(patient.dob)}y /{" "}
              {patient.sex ?? "Sex not recorded"} / {patient.levelOfCare.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/patients/${patient.id}/export?format=pdf`}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <a href="#voice-recorder" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm shadow-sm">
              <Mic className="h-4 w-4" />
              Record Note
            </a>
          </div>
        </div>

        {patient.lockbox && (
          <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Lockbox patient - access requires break-glass reason.
            </span>
          </div>
        )}
      </section>

      <div className="patient-workspace">
        <main className="min-w-0 space-y-5">
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="panel p-5">
              <SectionTitle icon={<Stethoscope className="h-4 w-4" />} title="Clinical summary" />
              <div className="mt-4 space-y-3">
                <Row label="Primary Dx" value={patient.primaryDx ?? "Not recorded"} />
                <Row label="ICD-10" value={patient.primaryDxIcd ?? "Not recorded"} mono />
                <Row label="Admitted" value={new Date(patient.admittedAt).toLocaleDateString()} />
                <Row label="Prognosis" value={patient.prognosisMo ? `${patient.prognosisMo} months` : "Not recorded"} />
                <Row label="Consent" value={patient.consentOnFile ? "On file" : "Missing"} />
              </div>
            </div>

            <div className="panel p-5">
              <SectionTitle icon={<Users className="h-4 w-4" />} title="Care network" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Allergies</div>
                  {patient.allergies.length === 0 ? (
                    <span className="badge badge-success">NKDA</span>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {patient.allergies.map((allergy) => (
                        <li key={allergy.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                          <span className="font-bold">{allergy.substance}</span>
                          {allergy.severity && <span className="badge badge-danger">{allergy.severity}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Caregivers</div>
                  {patient.contacts.length === 0 ? (
                    <span className="text-sm font-semibold text-slate-500">None on file</span>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {patient.contacts.map((contact) => (
                        <li key={contact.id} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                          <span className="font-bold">{contact.name}</span>
                          {contact.relationship && <span className="text-slate-500"> / {contact.relationship}</span>}
                          {contact.isPrimary && <span className="ml-2 badge badge-success">Primary</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          <PatientClinicalForms patientId={patient.id} canAddMedication={can(session?.user.role, "med.prescribe")} />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="panel p-5 xl:col-span-2">
              <SummaryCard patientId={patient.id} />
            </div>
            <VisitTimer patientId={patient.id} />
          </section>

          {patient.esasScores.length > 0 && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="panel p-5">
                <SectionTitle icon={<Activity className="h-4 w-4" />} title="ESAS trend" />
                <div className="mt-4">
                  <ESASChart data={patient.esasScores} />
                </div>
              </div>
              <div className="panel p-5">
                <SectionTitle icon={<HeartPulse className="h-4 w-4" />} title="PPS trend" />
                <div className="mt-4">
                  <PPSChart data={patient.ppsScores} />
                </div>
              </div>
            </section>
          )}

          <section id="voice-recorder" className="scroll-mt-24">
            <VoiceNoteRecorder patientId={patient.id} />
          </section>

          <section className="panel p-5">
            <SectionTitle icon={<Pill className="h-4 w-4" />} title={`Active medications (${patient.meds.length})`} />
            {patient.meds.length === 0 ? (
              <EmptyState icon={Pill} title="No active medications" hint="Medication orders will appear here once added." />
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {patient.meds.map((med) => (
                  <li key={med.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <span className="font-black text-slate-900">{med.name}</span>
                      <span className="ml-2 font-semibold text-slate-500">
                        {med.dose}
                        {med.route ? ` ${med.route}` : ""}
                        {med.frequency ? ` ${med.frequency}` : ""}
                      </span>
                      {med.indication && <span className="ml-2 text-xs font-semibold text-slate-400">- {med.indication}</span>}
                    </div>
                    {med.controlled && <span className="badge badge-danger">Controlled</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="panel p-5">
              <SectionTitle icon={<Activity className="h-4 w-4" />} title="Drug interaction check" />
              <div className="mt-4">
                <InteractionsPanel patientId={patient.id} />
              </div>
            </div>
            <PatientActions patientId={patient.id} isAdmin={session?.user.role === "ADMIN"} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="panel p-5">
              <FamilyLetter patientId={patient.id} />
            </div>
            <div className="panel space-y-4 p-5">
              <SectionTitle icon={<Camera className="h-4 w-4" />} title="Photos" />
              <PhotoUpload patientId={patient.id} />
              {patient.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {patient.photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <a href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/photos/${photo.id}`} alt={photo.caption ?? photo.filename} className="aspect-square w-full rounded-lg border border-stone-200 object-cover" />
                        <div className="mt-1 truncate text-xs font-semibold text-slate-600">{photo.caption ?? photo.filename}</div>
                      </a>
                      <PhotoDeleteButton photoId={photo.id} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Camera} title="No photos yet" hint="Wound and care photos will appear here after upload." />
              )}
            </div>
          </section>

          <section className="panel p-5">
            <SectionTitle icon={<FileText className="h-4 w-4" />} title="Recent notes" />
            {patient.clinicalNotes.length === 0 ? (
              <EmptyState icon={FileText} title="No notes yet" hint="Record a visit note to start the clinical timeline." />
            ) : (
              <ul className="mt-4 space-y-3">
                {patient.clinicalNotes.map((note) => (
                  <li key={note.id} className="rounded-lg border border-slate-200 bg-[var(--surface-muted)] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                      <span>/</span>
                      <span>
                        {note.author.name} ({note.author.role})
                      </span>
                      {note.signed && (
                        <span className="badge badge-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          signed
                        </span>
                      )}
                    </div>
                    {note.assessment && (
                      <div className="mt-2 text-sm">
                        <span className="font-black">A:</span> {note.assessment}
                      </div>
                    )}
                    {note.plan && (
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-black">P:</span> {note.plan}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside className="vitals-rail space-y-4">
          <section className="panel p-4">
            <SectionTitle icon={<HeartPulse className="h-4 w-4" />} title="Vitals rail" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="PPS" value={latestPps ? `${latestPps.score}%` : "--"} detail={latestPps ? new Date(latestPps.recordedAt).toLocaleDateString() : "No score"} />
              <Metric label="ESAS pain" value={latestEsas ? String(latestEsas.pain) : "--"} detail={latestEsas ? "Latest score" : "No score"} />
              <Metric label="Code" value={patient.codeStatus.replace(/_/g, "/")} detail="Order status" />
              <Metric label="LOC" value={patient.levelOfCare.replace(/_/g, " ")} detail="Level of care" />
            </div>
            {latestEsas && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">ESAS latest</div>
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
          </section>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">{icon}</span>
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className={mono ? "font-mono text-xs font-bold text-slate-900" : "text-right font-black text-slate-900"}>{value}</span>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-tile">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-slate-500">{detail}</div>
    </div>
  );
}

function ESASCell({ label, v }: { label: string; v: number }) {
  const color = v >= 7 ? "badge-danger" : v >= 4 ? "badge-warning" : "badge-success";
  return (
    <div className={`${color} rounded-lg px-1.5 py-1 text-center`}>
      <div className="text-[10px] uppercase tracking-wide opacity-75">{label}</div>
      <div className="font-black">{v}</div>
    </div>
  );
}
