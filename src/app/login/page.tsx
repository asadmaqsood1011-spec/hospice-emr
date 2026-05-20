import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { HeartPulse, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn, auth } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/patients");

  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        totp: formData.get("totp"),
        redirectTo: "/patients",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=invalid${callbackUrl ? `&callbackUrl=${callbackUrl}` : ""}`);
      }
      throw err;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_430px]">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border hairline bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--primary)]">
              <ShieldCheck className="h-4 w-4" />
              PHIPA-aware clinical workspace
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-normal text-[var(--foreground)]">
              Hospice EMR
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 muted">
              Voice-first charting, clinical handoffs, controlled-substance logging, and audit visibility for hospice teams.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["Voice SOAP", HeartPulse],
                ["Audit logged", ShieldCheck],
                ["2FA ready", KeyRound],
              ].map(([label, Icon]) => (
                <div key={String(label)} className="surface-card p-4">
                  <Icon className="h-5 w-5 text-[var(--primary)]" />
                  <div className="mt-3 text-sm font-semibold">{String(label)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card w-full p-6 sm:p-8">
          <div>
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--primary)] text-lg font-bold text-white">
              H
            </div>
            <h2 className="text-2xl font-bold tracking-normal">Sign in</h2>
            <p className="mt-1 text-sm muted">Authorized clinic personnel only.</p>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-950 dark:bg-red-950 dark:text-red-200">
              Invalid credentials or locked account.
            </div>
          )}

          <form action={login} className="mt-6 space-y-4">
            <Field icon={Mail} label="Email">
              <input id="email" name="email" type="email" required autoComplete="username" className="w-full rounded-lg border px-3 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </Field>
            <Field icon={LockKeyhole} label="Password">
              <input id="password" name="password" type="password" required autoComplete="current-password" minLength={8} className="w-full rounded-lg border px-3 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </Field>
            <Field icon={KeyRound} label="2FA code">
              <input id="totp" name="totp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" autoComplete="one-time-code" className="w-full rounded-lg border px-3 py-2.5 pl-10 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </Field>
            <button type="submit" className="btn-primary w-full px-4 py-2.5 text-sm">Sign in</button>
          </form>

          <div className="mt-6 border-t hairline pt-4 text-xs muted">
            Session idle timeout: 15 minutes. All patient access is recorded.
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 soft" />
        {children}
      </span>
    </label>
  );
}
