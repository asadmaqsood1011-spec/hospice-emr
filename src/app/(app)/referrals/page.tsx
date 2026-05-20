import { redirect } from "next/navigation";
import { Inbox, CheckCircle2, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferralForm } from "./referral-form";
import { ConvertReferralForm } from "./convert-form";

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "patient.create")) redirect("/patients");

  const referrals = await prisma.referral.findMany({
    orderBy: [{ status: "asc" }, { referredAt: "desc" }],
    take: 80,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            <Inbox className="h-3.5 w-3.5" />
            Admission pipeline
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Referrals</h1>
          <p className="mt-1 text-sm muted">Capture referrals, clear readiness gaps, and convert ready cases into admitted patients.</p>
        </div>
        <ReferralForm />
      </div>

      <section className="panel">
        <div className="border-b hairline px-5 py-3">
          <h2 className="text-sm font-semibold">Referral worklist</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {referrals.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Inbox} title="No referrals yet" hint="Create the first referral to start admission tracking." />
            </div>
          ) : (
            referrals.map((referral) => <ReferralRow key={referral.id} referral={referral} />)
          )}
        </div>
      </section>
    </div>
  );
}

type Referral = Awaited<ReturnType<typeof prisma.referral.findMany>>[number];

function ReferralRow({ referral }: { referral: Referral }) {
  const ready = referral.hospiceEligible && referral.consentReady && referral.documentsReady && referral.dob;
  return (
    <div className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{referral.lastName}, {referral.firstName}</h3>
            <Badge tone={referral.status === "READY_TO_ADMIT" ? "success" : referral.status === "ADMITTED" ? "info" : "warning"}>
              {referral.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-1 text-sm muted">
            {referral.primaryDx || "Diagnosis pending"} {referral.primaryDxIcd ? `(${referral.primaryDxIcd})` : ""} - {referral.source || "No source"} - {referral.payer || "No payer"}
          </div>
          {referral.notes && <p className="mt-2 text-sm">{referral.notes}</p>}
        </div>
        <div className="text-xs muted">{new Date(referral.referredAt).toLocaleString()}</div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <ReadyItem ok={Boolean(referral.dob)} label="DOB" />
        <ReadyItem ok={referral.hospiceEligible} label="Eligibility" />
        <ReadyItem ok={referral.consentReady} label="Consent" />
        <ReadyItem ok={referral.documentsReady} label="Docs" />
      </div>

      {referral.status !== "ADMITTED" && ready ? (
        <ConvertReferralForm referralId={referral.id} />
      ) : referral.status !== "ADMITTED" ? (
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          Complete readiness items before admission.
        </div>
      ) : null}
    </div>
  );
}

function ReadyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </div>
  );
}
