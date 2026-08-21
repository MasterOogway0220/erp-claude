import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

// Importing the module builds the real PrismaClient, which needs a URL to
// parse — hence the env var and the dynamic import.
process.env.DATABASE_URL ||= "mysql://user:pass@localhost:3306/erp";
const { poolConfig, SERVER_WAIT_TIMEOUT_SEC, SERVER_MAX_USER_CONNECTIONS } =
  await import("./prisma");

const cfg = poolConfig("mysql://u%40ser:p%40ss@db.example.com:3307/erp");

describe("poolConfig", () => {
  it("parses the connection URL, decoding escaped credentials", () => {
    expect(cfg).toMatchObject({
      host: "db.example.com",
      port: 3307,
      user: "u@ser",
      password: "p@ss",
      database: "erp",
    });
  });

  // The assertions below are the ones that actually broke production: a pool
  // that outlived the server's wait_timeout, and one that never opened a
  // socket at all. Keep the relationships, not just the numbers.
  it("retires a connection before the server closes it", () => {
    expect(cfg.idleTimeout).toBeGreaterThan(0);
    expect(cfg.idleTimeout).toBeLessThan(SERVER_WAIT_TIMEOUT_SEC);
  });

  it("leaves room to retry a connect inside one acquire window", () => {
    expect(cfg.connectTimeout * 2).toBeLessThanOrEqual(cfg.acquireTimeout);
  });

  // Since the move to a single long-lived process, this pool is the whole
  // application's connection budget — so it has to be big enough to serve
  // concurrent users, and still leave room under a cap shared with anything
  // else using these credentials (migrations, a psql session, a second deploy
  // mid-rollout). Anyone raising it past the server's own limit has moved the
  // outage rather than fixed it.
  it("keeps the pool inside the server's per-user connection cap", () => {
    expect(cfg.connectionLimit).toBeGreaterThan(1);
    expect(cfg.connectionLimit).toBeLessThanOrEqual(
      SERVER_MAX_USER_CONNECTIONS / 3
    );
    expect(cfg.minimumIdle).toBeLessThanOrEqual(cfg.connectionLimit);
  });
});

// Resolve the driver exactly as @prisma/adapter-mariadb does. It bundles its
// own nested mariadb, which has historically been a different version from the
// one hoisted to the top level — and the two disagree about what minimumIdle: 0
// means. Testing the hoisted copy is how a pool that never opens a connection
// shipped to production with a green suite.
const require_ = createRequire(import.meta.url);
const { createPool } = require_(
  require_.resolve("mariadb/promise", {
    paths: [require_.resolve("@prisma/adapter-mariadb")],
  })
);

describe("the pool actually opens sockets", () => {
  // Port 1 has nothing listening, so every connection attempt fails — which is
  // the point. Both a working and a broken pool end up rejecting the query
  // with ER_GET_CONNECTION_TIMEOUT, so the error code proves nothing. What
  // separates them is whether a socket was ever attempted: the pool emits
  // 'error' once per failed create, and a pool that never tries stays silent
  // and simply waits out acquireTimeout. That silence was the production
  // outage — every route dead with "active=0 idle=0" against a healthy DB.
  it("attempts a connection rather than waiting out acquireTimeout", async () => {
    const pool = createPool({
      ...poolConfig("mysql://u:p@127.0.0.1:1/erp"),
      acquireTimeout: 2000,
      connectTimeout: 500,
      initializationTimeout: 500,
    });
    let attempts = 0;
    pool.on("error", () => attempts++);

    await pool.query("SELECT 1").catch(() => {});
    await pool.end().catch(() => {});

    expect(attempts).toBeGreaterThan(0);
  });
});
