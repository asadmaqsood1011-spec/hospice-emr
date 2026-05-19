import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { AdmitForm } from "./admit-form";

export default async function NewPatientPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "patient.create")) redirect("/patients");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/patients"
          className="text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
        >
          ← All patients
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Admit New Patient</h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          Hospice eligibility requires MD attestation of ≤6 month prognosis.
        </p>
      </div>
      <AdmitForm />
    </div>
  );
}
