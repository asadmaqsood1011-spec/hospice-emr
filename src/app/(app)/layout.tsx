import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/patients" className="font-semibold text-slate-900">
              Hospice EMR
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/patients" className="text-slate-600 hover:text-slate-900">
                Patients
              </Link>
              <Link href="/visits" className="text-slate-600 hover:text-slate-900">
                Visits
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/audit" className="text-slate-600 hover:text-slate-900">
                  Audit
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded border border-slate-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-500 flex justify-between">
          <span>PHIPA-aware · Audit-logged · Session 15 min idle</span>
          <span>All access is recorded</span>
        </div>
      </footer>
    </div>
  );
}
