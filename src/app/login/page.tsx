import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-stone-50 to-teal-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-700 text-white text-xl font-semibold mb-3">
            H
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hospice EMR</h1>
          <p className="text-sm text-slate-600 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 text-sm rounded-lg px-3 py-2 font-medium">
            Invalid email or password.
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          <div>
            <label htmlFor="totp" className="block text-sm font-semibold text-slate-800 mb-1.5">
              2FA Code <span className="font-normal text-slate-500">(required after setup)</span>
            </label>
            <input
              id="totp"
              name="totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-700 text-white py-2.5 rounded-lg font-semibold hover:bg-teal-800 transition-colors shadow-sm"
          >
            Sign in
          </button>
        </form>

        <div className="text-xs text-slate-600 text-center pt-4 border-t border-stone-200">
          <p>PHIPA-aware · Session times out after 15 min idle</p>
          <p className="mt-1">Authorized clinic personnel only</p>
        </div>
      </div>
    </div>
  );
}
