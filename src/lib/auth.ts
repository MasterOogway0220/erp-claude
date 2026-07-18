import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";
import { parseModuleAccess } from "./access/module-access";
import { createAuditLog } from "./audit";

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
  }
}

// How often to re-check the user row (isActive, role, grants) against the DB.
// Every request paid a DB round trip before; 5 min bounds the staleness instead.
const REVERIFY_INTERVAL_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.moduleAccess = user.moduleAccess;
        token.verifiedAt = Date.now();
        return token;
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
        return null as unknown as typeof session;
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
