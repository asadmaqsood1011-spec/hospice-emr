import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/totp";
import {
  checkLoginAllowed,
  clinicalRoleNeedsTotp,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/login-guard";
import type { Role } from "@/generated/prisma";

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp: z.string().optional(),
});

const IDLE_MIN = Number(process.env.SESSION_IDLE_TIMEOUT_MIN ?? "15");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: IDLE_MIN * 60, // idle timeout in seconds
    updateAge: 60, // refresh every 1min of activity
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP", type: "text" },
      },
      authorize: async (creds) => {
        const parsed = CredsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const allowed = await checkLoginAllowed(email);
        if (!allowed.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.active) {
          await recordLoginFailure(email, "unknown-or-inactive-user");
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await recordLoginFailure(email, "bad-password");
          return null;
        }

        let totpVerified = false;
        if (user.totpEnabled) {
          const code = (parsed.data.totp ?? "").trim();
          if (!code || !user.totpSecret) {
            await recordLoginFailure(email, "missing-totp");
            return null;
          }
          if (!verifyToken(code, user.totpSecret)) {
            await recordLoginFailure(email, "bad-totp");
            return null;
          }
          totpVerified = true;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await recordLoginSuccess(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          totpRequired: clinicalRoleNeedsTotp(user.role),
          totpVerified,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.totpRequired = (user as { totpRequired?: boolean }).totpRequired ?? false;
        token.totpVerified = (user as { totpVerified?: boolean }).totpVerified ?? false;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: Role }).role = token.role as Role;
        session.user.totpRequired = Boolean(token.totpRequired);
        session.user.totpVerified = Boolean(token.totpVerified);
      }
      return session;
    },
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic = pathname.startsWith("/login") || pathname === "/" || pathname === "/api/health";
      if (isPublic) return true;
      if (!isLoggedIn) return false;

      const needsTotp = auth.user.totpRequired && !auth.user.totpVerified;
      if (needsTotp && !pathname.startsWith("/settings/2fa")) {
        const url = request.nextUrl.clone();
        url.pathname = "/settings/2fa";
        url.searchParams.set("required", "1");
        return Response.redirect(url);
      }

      return true;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      totpRequired?: boolean;
      totpVerified?: boolean;
    };
  }
}
