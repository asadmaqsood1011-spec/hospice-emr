"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileSearch,
  Inbox,
  KeyRound,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const COMMANDS = [
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Referrals", href: "/referrals", icon: Inbox },
  { label: "Visits", href: "/visits", icon: CalendarDays },
  { label: "On-call handoff", href: "/on-call", icon: ClipboardList },
  { label: "Controlled substances", href: "/controlled-substances", icon: Pill },
  { label: "Quality", href: "/quality", icon: ShieldCheck, adminOnly: true },
  { label: "Trajectory triage", href: "/decline", icon: Activity },
  { label: "Integrations", href: "/integrations", icon: Settings, adminOnly: true },
  { label: "Audit", href: "/audit", icon: FileSearch },
  { label: "Two-factor auth", href: "/settings/2fa", icon: KeyRound },
];

export function CommandPalette({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = COMMANDS.filter((command) => isAdmin || !command.adminOnly);
    if (!q) return allowed;
    return allowed.filter((command) => command.label.toLowerCase().includes(q));
  }, [isAdmin, query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-48 items-center gap-2 rounded-lg border hairline bg-[var(--surface-muted)] px-3 py-2 text-sm muted transition hover:bg-[var(--surface)] md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="text-left">Search</span>
        <span className="ml-auto rounded border hairline px-1.5 py-0.5 text-[11px] soft">Cmd K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/25 px-4 pt-20 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div
            className="mx-auto max-w-xl overflow-hidden rounded-lg border hairline bg-[var(--surface)] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b hairline px-4 py-3">
              <Search className="h-4 w-4 soft" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workspace"
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.map((command) => (
                <button
                  key={command.href}
                  type="button"
                  onClick={() => go(command.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-muted)]"
                >
                  <command.icon className="h-4 w-4 soft" />
                  <span className="font-medium">{command.label}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-8 text-center text-sm muted">No results</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
