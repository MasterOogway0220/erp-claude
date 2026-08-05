import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The DB server closes an idle connection after this many seconds
// (`SHOW VARIABLES LIKE 'wait_timeout'` on the Hostinger instance). The pool
// must let go of a socket before the server does.
export const SERVER_WAIT_TIMEOUT_SEC = 20;

// Exported so the pool tuning below can be asserted without opening a socket.
export function poolConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    // Hostinger's MySQL sets wait_timeout/interactive_timeout to 20s, and the
    // driver keeps `minimumIdle` (= connectionLimit) sockets warm by default —
    // so every Vercel instance re-opened 5 connections every ~20s forever, even
    // while completely idle (measured: 20 connects in 70s of doing nothing).
    // That churn is what tipped the shared server into refusing connects, and
    // every request then died on "pool timeout ... (active=0 idle=0 limit=5)".
    // Open on demand instead, and retire a socket before the server kills it.
    minimumIdle: 0,
    idleTimeout: 10,
    // connectTimeout must stay well under acquireTimeout: with both at 10s a
    // single slow connect consumed the whole acquire window and the request
    // failed instead of retrying. 5s leaves room for the driver's backoff
    // retries inside one acquire.
    connectTimeout: 5000,
    acquireTimeout: 15000,
    socketTimeout: 30000,
  };
}

function createAdapter() {
  return new PrismaMariaDb(poolConfig(process.env.DATABASE_URL!));
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
