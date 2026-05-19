import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { OnlineStatus } from "@/components/online-status";
import { RecentPatientsNav } from "@/components/recent-patients";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b-2 border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/patients" className="flex items-center gap-2 font-bold text-slate-900">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-700 text-white text-sm">H</span>
              Hospice EMR
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link href="/patients" className="text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                Patients
              </Link>
              <Link href="/visits" className="text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                Visits
              </Link>
              <Link href="/quality" className="hidden sm:inline text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                Quality
              </Link>
              <Link href="/decline" className="hidden sm:inline text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                Decline
              </Link>
              <Link href="/settings/2fa" className="hidden sm:inline text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                2FA
              </Link>
              <Link href="/integrations" className="hidden xl:inline text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                Integrations
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/audit" className="text-slate-700 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                  Audit
                </Link>
              )}
            </nav>
            <RecentPatientsNav />
          </div>
          <div className="flex items-center gap-3">
            <OnlineStatus />
            <ThemeToggle />
            <div className="text-right text-sm">
              <div className="font-semibold text-slate-900">{user.name}</div>
              <div className="text-xs font-medium text-teal-700">{user.role}</div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-stone-200 shadow-lg">
        <div className="grid grid-cols-5 text-xs font-bold text-slate-700">
          <Link href="/patients" className="py-2 text-center hover:bg-teal-50">Patients</Link>
          <Link href="/visits" className="py-2 text-center hover:bg-teal-50">Visits</Link>
          <Link href="/quality" className="py-2 text-center hover:bg-teal-50">Quality</Link>
          <Link href="/decline" className="py-2 text-center hover:bg-teal-50">Decline</Link>
          <Link href="/settings/2fa" className="py-2 text-center hover:bg-teal-50">2FA</Link>
        </div>
      </nav>
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-600 flex justify-between">
          <span className="font-medium">PHIPA-aware · Audit-logged · Session 15 min idle</span>
          <span>All access is recorded</span>
        </div>
      </footer>
    </div>
  );
}
