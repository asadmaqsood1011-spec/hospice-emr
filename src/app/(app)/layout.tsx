import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { CommandPalette } from "@/components/command-palette";
import { OnlineStatus } from "@/components/online-status";
import { RecentPatientsNav } from "@/components/recent-patients";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Inbox,
  KeyRound,
  LogOut,
  Pill,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/patients", label: "Patients", icon: Users, show: "always" },
  { href: "/referrals", label: "Referrals", icon: Inbox, show: "always" },
  { href: "/visits", label: "Visits", icon: CalendarDays, show: "always" },
  { href: "/on-call", label: "On-call", icon: ClipboardList, show: "lg" },
  { href: "/controlled-substances", label: "Med log", icon: Pill, show: "xl" },
  { href: "/quality", label: "Quality", icon: ShieldCheck, show: "sm", adminOnly: true },
  { href: "/decline", label: "Triage", icon: Activity, show: "sm" },
  { href: "/integrations", label: "Integrations", icon: Settings, show: "xl", adminOnly: true },
  { href: "/settings/2fa", label: "2FA", icon: KeyRound, show: "sm" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  return (
    <div className="app-shell flex flex-col">
      <header className="app-header sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/patients" className="flex shrink-0 items-center gap-2 font-bold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                <Stethoscope className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">Hospice EMR</span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
              {navItems.filter((item) => !item.adminOnly || user.role === "ADMIN").map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={`nav-link px-3 py-2 ${item.show === "xl" ? "hidden xl:inline-flex" : item.show === "sm" ? "hidden sm:inline-flex" : ""}`}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {user.role === "ADMIN" && (
                <Link href="/audit" className="nav-link px-3 py-2">
                  <ShieldCheck className="h-4 w-4" />
                  Audit
                </Link>
              )}
            </nav>
            <RecentPatientsNav />
          </div>

          <div className="flex items-center gap-3">
            <CommandPalette isAdmin={user.role === "ADMIN"} />
            <OnlineStatus />
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-2.5 py-1.5 text-sm font-bold shadow-sm">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-black text-white">
                  {user.name?.slice(0, 1) ?? "U"}
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block leading-4">{user.name}</span>
                  <span className="block text-[11px] font-semibold uppercase text-[var(--primary)]">{user.role}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 soft" />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-lg border hairline bg-[var(--surface)] p-2 shadow-xl">
                <div className="border-b hairline px-2 py-2">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs muted">{user.email}</div>
                </div>
                <div className="py-2">
                  <ThemeToggle />
                </div>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">{children}</main>

      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 sm:hidden">
        <div className="grid grid-cols-5 text-[11px] font-semibold">
          {navItems.filter((item) => !item.adminOnly || user.role === "ADMIN").slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 muted">
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <footer className="hidden border-t hairline bg-[var(--surface)] sm:block">
        <div className="mx-auto flex max-w-[1500px] justify-between px-4 py-3 text-xs muted sm:px-6">
          <span className="font-medium">HIPAA-ready. Audit-logged. Session 15 min idle.</span>
          <span>All access is recorded</span>
        </div>
      </footer>
    </div>
  );
}
