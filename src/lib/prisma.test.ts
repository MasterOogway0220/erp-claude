import { describe, it, expect } from "vitest";

// Importing the module builds the real PrismaClient, which needs a URL to
// parse — hence the env var and the dynamic import.
process.env.DATABASE_URL ||= "mysql://user:pass@localhost:3306/erp";
const { poolConfig, SERVER_WAIT_TIMEOUT_SEC } = await import("./prisma");

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

  // The three assertions below are the ones that actually broke production:
  // a pool that outlived the server's wait_timeout, held sockets open while
  // idle, and could not retry a slow connect. Keep the relationships, not
  // just the numbers.
  it("retires a connection before the server closes it", () => {
    expect(cfg.idleTimeout).toBeGreaterThan(0);
    expect(cfg.idleTimeout).toBeLessThan(SERVER_WAIT_TIMEOUT_SEC);
  });

  it("holds no idle connections — every instance is serverless", () => {
    expect(cfg.minimumIdle).toBe(0);
  });

  it("leaves room to retry a connect inside one acquire window", () => {
    expect(cfg.connectTimeout * 2).toBeLessThanOrEqual(cfg.acquireTimeout);
  });
});
