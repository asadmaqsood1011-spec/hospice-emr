import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, otpAuthUrl } from "@/lib/totp";
import { Enable2FA, Disable2FA } from "./buttons";

export default async function TwoFaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  let secret = user.totpSecret;
  if (!user.totpEnabled) {
    secret = secret ?? generateSecret();
    if (!user.totpSecret) {
      await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    }
  }

  const otpUrl = secret ? otpAuthUrl(secret, user.email) : "";
  const qrDataUrl = otpUrl ? await QRCode.toDataURL(otpUrl) : "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Two-Factor Authentication</h1>

      {user.totpEnabled ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 text-2xl">OK</span>
            <span className="font-semibold text-slate-900">2FA enabled</span>
          </div>
          <Disable2FA />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-5">
          {qrDataUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-100 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="2FA QR code" className="w-44 h-44" />
              <div className="text-xs text-center sm:text-left">
                <div className="font-semibold text-slate-700 mb-1">Manual secret</div>
                <code className="block bg-white px-3 py-2 rounded font-mono text-xs break-all border border-stone-300">
                  {secret}
                </code>
              </div>
            </div>
          )}

          <Enable2FA />
        </div>
      )}
    </div>
  );
}
