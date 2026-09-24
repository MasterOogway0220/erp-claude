import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { sandboxAdapter } from "./sandbox/adapter";
import { currentSandbox } from "./sandbox/context";
import { routedClient } from "./sandbox/router";
import { MODEL_TABLES } from "./sandbox/tables";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sandboxPrisma: PrismaClient | undefined;
};

// The DB server closes an idle connection after this many seconds
// (`SHOW VARIABLES LIKE 'wait_timeout'` on the Hostinger instance). The pool
// must let go of a socket before the server does.
export const SERVER_WAIT_TIMEOUT_SEC = 20;

// `SHOW VARIABLES LIKE 'max_user_connections'` on the same instance. This is a
// per-database-user cap on a shared server, so it is a hard ceiling we do not
// control, and every instance of this app shares it. Exported so the pool
// cannot quietly be tuned past it.
export const SERVER_MAX_USER_CONNECTIONS = 75;

// Exported so the pool tuning below can be asserted without opening a socket.
export function poolConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    // The right value depends on how many processes there are, so it is an env
    // var rather than a constant.
    //
    // On Vercel — the only deployment today — this is 5 *per lambda instance*,
    // and the real ceiling is 5 x however many instances are warm, which
    // nobody controls. Raising it is the fastest way to exhaust the 75 above,
    // so it stays unset in production.
    //
    // It is a variable at all because a single long-lived process (a container
    // or a VM) wants the opposite: there the pool is the whole application's
    // budget for concurrent queries, and 5 would make a handful of
    // simultaneous users queue behind acquireTimeout. Set it to ~10 there, and
    // only there.
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 5,
    // Zero, so an idle instance holds no socket and opens one only when a
    // query needs it.
    //
    // Hostinger's MySQL sets wait_timeout/interactive_timeout to 20s, and the
    // driver keeps `minimumIdle` sockets warm — it reopens whatever the server
    // just killed, forever, with nobody using the app. Any non-zero value
    // therefore makes connection count a function of wall-clock time rather
    // than of traffic, and the account's real ceiling is not the 75 concurrent
    // above but MAX_CONNECTIONS_PER_HOUR (~500). At minimumIdle: 1 a single
    // warm instance spends ~180 connects/hour doing nothing; a few warm
    // instances lock the whole database out before a user logs in. Measured
    // against a socket-counting server: minimumIdle 1 = 5 dials in 12s idle,
    // minimumIdle 0 = 0.
    //
    // This is only safe because of the `overrides` pin in package.json.
    // `@prisma/adapter-mariadb` depends on mariadb 3.4.5 exactly, so npm nests
    // that copy and the 3.5.1 hoisted at the top level never loads. 3.4.5
    // decides whether to open a socket with:
    //     idleConnections.length < opts.minimumIdle
    // With minimumIdle: 0 that is false forever, so the pool never opens a
    // single connection and every query waits out acquireTimeout and dies on
    // "pool timeout ... (active=0 idle=0 limit=5)" — the whole app, not one
    // route. 3.5.1 rewrote that check to also open on demand for a pending
    // request (measured: 3.4.5 = 0 dials on a query, 3.5.1 = 4). The override
    // forces the nested copy to 3.5.1; drop it and this 0 is an outage.
    // prisma.test.ts resolves the driver the way the adapter does and asserts
    // a socket is actually attempted, so the pairing cannot silently break.
    minimumIdle: 0,
    // Retires any socket beyond `minimumIdle` before the server's 20s kill.
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

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  // Named explicitly: the URL parse below would otherwise fail with
  // "TypeError: Invalid URL ... input: 'undefined'", which names neither the
  // variable nor the file.
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({
    adapter: new PrismaMariaDb(poolConfig(databaseUrl)),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

// The sandbox login's client: same database, but every statement is renamed
// onto the sbx_* table copies before it is sent (see src/lib/sandbox/). Its
// own small pool, so a sandbox session never waits on real users' sockets.
// Two connections, not one: route code sometimes calls `prisma.*` from inside
// a `$transaction` callback, which needs a second socket while the first is
// held by the transaction.
function createSandboxClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: sandboxAdapter(new PrismaMariaDb({ ...poolConfig(databaseUrl), connectionLimit: 2 }), MODEL_TABLES),
    log: ["error"],
  });
}

// Built on first use, not on import.
//
// `next build` collects page data by evaluating every route module, and every
// route that touches the database imports this one. Constructing the client
// here at module scope therefore made the *build* require DATABASE_URL — a
// runtime secret. On Vercel that variable is scoped to Production only, so
// every preview build died during page-data collection with
// "TypeError: Invalid URL ... input: 'undefined'", reported against whichever
// route happened to be collected first (/api/admin/audit-logs). Production
// builds passed only because the variable happens to exist there, which is why
// this survived unnoticed.
//
// Deferring costs nothing: constructing a PrismaClient opens no socket (the
// driver adapter's pool connects lazily on the first query), so the only thing
// that moves is when the URL is read.
const realClient = () => (globalForPrisma.prisma ??= createClient());

/**
 * The real client, never routed to the sandbox. Only for reads that must see
 * real data even inside a sandbox request — login identity checks. Anything
 * that writes must use `prisma`.
 */
export const realPrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = realClient();
    const value = Reflect.get(client, prop, client);
    // Methods must keep their `this`; model delegates are plain properties.
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Each call is routed: a request middleware marked as the sandbox login
// (x-erp-sandbox, from a verified JWT) runs on the sandbox client, everything
// else on the real one. See src/lib/sandbox/router.ts.
export const prisma: PrismaClient = routedClient(
  realClient,
  () => (globalForPrisma.sandboxPrisma ??= createSandboxClient()),
  currentSandbox
);

// The globalThis caches live in the factories above, so the pools are reused
// across hot reloads (dev) and across module re-evaluations on some Node.js
// hosts (prod). They must NOT also be assigned here: that would store the
// proxy itself, `??=` would then find it already set, and every property
// access would resolve back through the proxy into itself and recurse forever.
