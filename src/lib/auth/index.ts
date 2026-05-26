import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { verifyHandoffToken } from "@/lib/twofa/core";
import { verifyDemoToken } from "@/lib/demo/token";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }
  interface User {
    emailVerified?: Date | null;
  }
}

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: env.AUTH_TRUST_HOST === "true" || env.AUTH_TRUST_HOST === "1",
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
    error: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email + wachtwoord",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(creds) {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        // Allow login but force verification flow if email not verified.
        // The middleware/dashboard layout should redirect unverified users to /verify-email.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
    Credentials({
      // Handoff provider: signs the user in *after* a successful 2FA
      // challenge. The token is an HMAC-signed userId set by the server in
      // an HttpOnly cookie at the end of password-validation, so this
      // provider cannot be invoked directly by a user.
      id: "2fa-handoff",
      name: "2FA handoff",
      credentials: {
        token: { label: "Handoff token", type: "text" },
      },
      async authorize(creds) {
        const token = typeof creds?.token === "string" ? creds.token : null;
        const payload = verifyHandoffToken(token ?? undefined);
        if (!payload) return null;
        // Only "verify" tokens are accepted here — "setup" tokens must
        // first go through confirmSetupAction which then re-signs as
        // "verify" before signing in.
        if (payload.mode !== "verify") return null;
        const user = await db.user.findUnique({
          where: { id: payload.userId },
        });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
    Credentials({
      // Demo handoff: /demo page genereert een korte-TTL HMAC-token die
      // hier ingewisseld wordt voor een echte NextAuth-sessie. Geen
      // wachtwoord; userId zit in de token (signed). Alleen users met
      // isDemo=true mogen — anders kan iemand met een gelekte token
      // theoretisch andere accounts overnemen. De token-TTL is 5 min
      // dus replay-windows zijn klein, maar de extra check kost niks.
      id: "demo-handoff",
      name: "Demo handoff",
      credentials: {
        token: { label: "Demo token", type: "text" },
      },
      async authorize(creds) {
        const token = typeof creds?.token === "string" ? creds.token : null;
        const payload = verifyDemoToken(token ?? undefined);
        if (!payload) return null;
        const user = await db.user.findUnique({
          where: { id: payload.userId },
        });
        if (!user || !user.isDemo) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
    Resend({
      apiKey: env.RESEND_API_KEY || "no-op",
      from: env.RESEND_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendEmail({
          to: identifier,
          subject: "Inloggen bij BookingBay",
          html: emailLayout(`
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Inloggen bij BookingBay</h1>
            <p style="margin:0 0 24px 0">Klik op de knop hieronder om in te loggen. De link verloopt na 10 minuten.</p>
            <p style="margin:0 0 24px 0">${btn(url, "Inloggen")}</p>
            <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;word-break:break-all">
              Werkt de knop niet? Plak deze link in je browser:<br>
              <span style="color:#1a2238">${url}</span>
            </p>
          `),
          text: `Klik om in te loggen: ${url}\n\nDe link verloopt na 10 minuten.`,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.emailVerified = user.emailVerified ?? null;
      }
      if (trigger === "update" && session?.emailVerified !== undefined) {
        token.emailVerified = session.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? token.sub ?? "";
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
  },
});
