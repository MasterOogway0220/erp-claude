import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter() {
  const url = new URL(process.env.DATABASE_URL!);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    connectTimeout: 10000,
    socketTimeout: 30000,
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

// Always cache on globalThis so the pool is reused across hot reloads (dev)
// and across module re-evaluations on some Node.js hosts (prod)
globalForPrisma.prisma = prisma;
