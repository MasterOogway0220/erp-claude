import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";
import { parseModuleAccess } from "./access/module-access";
import { createAuditLog } from "./audit";
import { OTP_ERRORS, otpEnabled, otpRequiredFor, sessionExpired } from "./auth/otp-policy";
import { verifyOtp } from "./auth/otp";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      companyId: string | null;
      moduleAccess: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string | null;
    moduleAccess: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyId: string | null;
    moduleAccess: string[];
    verifiedAt?: number;
    /** Sign-in time, set once — the anchor for the absolute 24h session cap. */
    loginAt?: number;
  }
}

// How often to re-check the user row (isActive, role, grants) against the DB.
// Every request paid a DB round trip before; 5 min bounds the staleness instead.
//
// This is now the only thing that ends a session promptly. Sessions run for
// 30 idle days (see `session.maxAge`) and a JWT cannot be revoked, so
// deactivating someone in Employee Master takes effect when this next runs and
// finds `isActive: false`. Lengthening this interval directly lengthens how
// long a deactivated account keeps working; the 30-day expiry is only a
// backstop behind it, not a substitute.
const REVERIFY_INTERVAL_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "Login code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { employee: { select: { moduleAccess: true } } },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Second factor. Enforced here rather than only in the login page so a
        // direct POST to /api/auth/callback/credentials can't skip it. Admins
        // are exempt — see OTP_EXEMPT_ROLES.
        if (otpRequiredFor(user.role)) {
          if (!credentials.otp) throw new Error("Login code is required");
          const check = await verifyOtp(user.email, credentials.otp.trim());
          if (!check.ok) throw new Error(OTP_ERRORS[check.reason]);
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        // createAuditLog swallows its own errors, so a logging failure can never block login
        await createAuditLog({
          tableName: "user",
          recordId: user.id,
          action: "LOGIN",
          userId: user.id,
          companyId: user.companyId,
        });

        // moduleAccess is stored as a JSON string in EmployeeMaster.moduleAccess
        // (LongText). Parse it — Array.isArray() on a string is always false.
        const moduleAccess = parseModuleAccess(user.employee?.moduleAccess);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          moduleAccess,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // In practice "signed in until you sign out", with an outer bound.
    //
    // next-auth treats maxAge as a sliding window and re-issues the token on
    // every session poll, so anyone who keeps using the app is never forced to
    // re-authenticate. The window only matters to an *idle* session: the old
    // 24h logged out anyone who did not come back for a day, which is the
    // Monday-morning problem. 30 days covers a weekend, a holiday, or a rep
    // out on site, so in day-to-day use a session ends when the user signs
    // out.
    //
    // The 30-day bound is the deliberate part. These are JWT sessions: there
    // is no server-side session table, so a token cannot be revoked. The only
    // thing that ends access early is the periodic re-verify in the jwt
    // callback noticing `isActive: false` and blanking the token — so do not
    // lengthen REVERIFY_INTERVAL_MS and do not remove the isActive check. A
    // laptop lost with a live session keeps it until the account is
    // deactivated and one re-verify lands, and failing that until this expiry.
    // Removing the expiry would leave nothing but deactivation, on machines
    // that are shared between shifts.
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.moduleAccess = user.moduleAccess;
        token.verifiedAt = Date.now();
        // Stamped once, never refreshed — this is what makes the 24h window
        // absolute instead of sliding.
        token.loginAt = Date.now();
        return token;
      }

      // Hard 24h cap from sign-in, tighter than the 30-day `session.maxAge`
      // and independent of it. It applies to 2FA logins alone — when OTP is
      // off (the default) this branch never runs, which is the intended "stay
      // signed in until you sign out" behaviour. Turning OTP on deliberately
      // buys back a daily re-authentication for the roles that need one.
      //
      // Blanking the token is the same mechanism the deactivated-user path
      // below uses: the session reads as signed out and middleware sends them
      // to /login.
      if (otpEnabled() && sessionExpired(token.loginAt, Date.now())) {
        return {} as typeof token;
      }
      // Re-verify periodically so deactivated users get booted mid-session
      // (throttled — this was a DB query on every single request).
      if (token.id && Date.now() - (token.verifiedAt ?? 0) > REVERIFY_INTERVAL_MS) {
        let current;
        try {
          current = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              isActive: true,
              role: true,
              companyId: true,
              employee: { select: { moduleAccess: true } },
            },
          });
        } catch (err) {
          // A transient DB failure (Hostinger connection caps) must not kill the
          // session: throwing here makes next-auth report no session (401) and,
          // when it happens on /api/auth/session, DELETE the session cookie.
          console.error("[auth] re-verify skipped, DB error:", err);
          // Back off ~1 min (persists via the session-endpoint cookie re-issue)
          // so an outage isn't hammered with a failing query on every poll.
          token.verifiedAt = Date.now() - REVERIFY_INTERVAL_MS + 60_000;
          return token;
        }
        if (!current || !current.isActive) {
          return {} as typeof token;
        }
        token.role = current.role;
        token.companyId = current.companyId;
        // Refresh grants so module-access changes take effect without re-login.
        token.moduleAccess = parseModuleAccess(current.employee?.moduleAccess);
        token.verifiedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) {
        // Signed-out, not a half-session: `{ user: undefined }` is truthy, so it
        // passes `!session` checks and crashes routes at session.user.id (500).
        // An empty object reads as "no session" both in getServerSession (empty
        // body -> null) and in the next-auth client poller, and unlike a null
        // body it doesn't trigger CLIENT_FETCH_ERROR noise in the browser.
        return {} as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.moduleAccess = token.moduleAccess;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
