import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

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
  }
}

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

        const moduleAccess = Array.isArray(user.employee?.moduleAccess)
          ? (user.employee.moduleAccess as string[])
          : [];

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
        return token;
      }
      // Re-verify on subsequent requests so deactivated users get booted mid-session
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { isActive: true, role: true, companyId: true },
        });
        if (!current || !current.isActive) {
          return {} as typeof token;
        }
        token.role = current.role;
        token.companyId = current.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) {
        return { ...session, user: undefined } as typeof session;
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
