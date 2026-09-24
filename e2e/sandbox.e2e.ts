// End-to-end verification of the sandbox login (checks 1–8 of the spec).
//
//   docker start erp-sandbox-db
//   E2E_DATABASE_URL=mysql://root:localroot@127.0.0.1:3307/erp_local npx vitest run -c vitest.e2e.config.ts
//
// Starts `next dev` on :3100 against that database, signs in as the admin and
// as Akash over HTTP, and drives real API routes. Refuses any non-local DB.
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { poolConfig } from "@/lib/prisma";
import { MODEL_TABLES } from "@/lib/sandbox/tables";
import { refreshSandboxCopy } from "@/lib/sandbox/refresh";
import { assertNoRealTables } from "@/lib/sandbox/rewrite";
import { fakeSmtp, login, startServer, stopServer, type Api } from "./helpers";

const DB_URL = process.env.E2E_DATABASE_URL;
const SMTP_PORT = 2525;
const AKASH = { email: "akash.sandbox@demo.local", password: "Akash@Sandbox#2026" };
const ADMIN = { email: "admin@npipe.com", password: "Npipe@123" };

describe.skipIf(!DB_URL)("sandbox login, end to end", () => {
  let server: ChildProcess | undefined;
  let smtp: Awaited<ReturnType<typeof fakeSmtp>>;
  let db: PrismaClient;
  let akash: Api;
  let admin: Api;
  let checksumsBefore: Record<string, string>;
  const fx = { editC: "", deleteC: "", adminC: "", quotation: "", created: "" };

  async function checksums() {
    const out: Record<string, string> = {};
    for (const t of MODEL_TABLES) {
      const [row] = await db.$queryRawUnsafe<{ Checksum: bigint }[]>(`CHECKSUM TABLE \`${t}\``);
      const [{ n }] = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) n FROM \`${t}\``);
      out[t] = `${row.Checksum}/${n}`;
    }
    return out;
  }
  const customers = async (api: Api, init?: RequestInit) =>
    ((await (await api("/api/masters/customers?includeInactive=true", init)).json()) as {
      customers: { id: string; name: string }[];
    }).customers;
  const names = async (api: Api) => new Map((await customers(api)).map((c) => [c.id, c.name]));

  beforeAll(async () => {
    if (!/127\.0\.0\.1|localhost/.test(DB_URL!)) throw new Error("refusing: E2E_DATABASE_URL is not local");
    db = new PrismaClient({ adapter: new PrismaMariaDb({ ...poolConfig(DB_URL!), connectionLimit: 2 }) });

    // Real fixture data, made before the copy so the sandbox starts with it.
    const admin_ = await db.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const companyId = admin_.companyId!;
    const stamp = Date.now();
    const mk = (name: string) => db.customerMaster.create({ data: { name: `${name} ${stamp}`, companyId } });
    fx.editC = (await mk("E2E Edit Me")).id;
    fx.deleteC = (await mk("E2E Delete Me")).id;
    fx.adminC = (await mk("E2E Admin Edits")).id;
    const qCust = await mk("E2E Quote Customer");
    fx.quotation = (
      await db.quotation.create({
        data: { quotationNo: `E2E-${stamp}`, customerId: qCust.id, companyId, status: "APPROVED" },
      })
    ).id;
    await db.user.update({ where: { email: AKASH.email }, data: { companyId } });
    await refreshSandboxCopy(DB_URL!);

    smtp = await fakeSmtp(SMTP_PORT);
    server = await startServer({
      DATABASE_URL: DB_URL!,
      NEXTAUTH_URL: "http://localhost:3100",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(SMTP_PORT),
      SMTP_USER: "e2e",
      SMTP_PASS: "e2e",
      OTP_ENABLED: "false",
      SANDBOX_RESET_COOLDOWN_MS: "3000",
    });
    admin = await login(ADMIN.email, ADMIN.password);
    akash = await login(AKASH.email, AKASH.password);

    // Akash's window starts: record real-table state and every statement.
    checksumsBefore = await checksums();
    await db.$executeRawUnsafe("SET GLOBAL general_log = 0");
    await db.$executeRawUnsafe("TRUNCATE TABLE mysql.general_log");
    await db.$executeRawUnsafe("SET GLOBAL log_output = 'TABLE'");
    await db.$executeRawUnsafe("SET GLOBAL general_log = 1");
  }, 400_000);

  afterAll(async () => {
    await db?.$executeRawUnsafe("SET GLOBAL general_log = 0").catch(() => {});
    stopServer(server);
    smtp?.close();
    await db?.$disconnect();
  });

  it("1. Akash's edit is visible to him only", async () => {
    const r = await akash(`/api/masters/customers/${fx.editC}`, { method: "PATCH", body: JSON.stringify({ name: "SANDBOX EDIT" }) });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    expect((await names(akash)).get(fx.editC)).toBe("SANDBOX EDIT");
    expect((await names(admin)).get(fx.editC)).not.toBe("SANDBOX EDIT");
  });

  it("2. Akash's new record appears for him only", async () => {
    const r = await akash("/api/masters/customers", { method: "POST", body: JSON.stringify({ name: "SANDBOX NEW CUSTOMER" }) });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    fx.created = (await r.json()).id;
    expect((await names(akash)).has(fx.created)).toBe(true);
    expect((await names(admin)).has(fx.created)).toBe(false);
    expect(await db.customerMaster.count({ where: { id: fx.created } })).toBe(0);
  });

  it("3. Akash's delete hides the record for him only; it still exists for real", async () => {
    const r = await akash(`/api/masters/customers/${fx.deleteC}`, { method: "DELETE" });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    expect((await names(akash)).has(fx.deleteC)).toBe(false);
    expect((await names(admin)).has(fx.deleteC)).toBe(true);
    expect(await db.customerMaster.count({ where: { id: fx.deleteC } })).toBe(1);
  });

  it("a forged sandbox header does not put a normal user into the sandbox", async () => {
    // Right now the copy lacks deleteC (check 3). If the forged header were
    // honoured the admin would be reading the copy and not see it.
    const list = await customers(admin, { headers: { "x-erp-sandbox": "someone" } });
    expect(list.some((c) => c.id === fx.deleteC)).toBe(true);
  });

  it("6. Emailing a quotation completes for Akash but nothing reaches SMTP", async () => {
    const r = await akash(`/api/quotations/${fx.quotation}/email`, {
      method: "POST",
      body: JSON.stringify({ to: "buyer@example.com", subject: "E2E", message: "hi" }),
    });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    expect(smtp.connections()).toBe(0);
    // The quotation's SENT status change landed in the copy, not for real.
    expect((await db.quotation.findUniqueOrThrow({ where: { id: fx.quotation } })).status).toBe("APPROVED");
  });

  it("Akash changing his password (an /api/auth/* route) stays in the sandbox", async () => {
    const before = (await db.user.findUniqueOrThrow({ where: { email: AKASH.email } })).passwordHash;
    const r = await akash("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: AKASH.password, newPassword: "Sandbox-Only-Pw-1" }),
    });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    expect((await db.user.findUniqueOrThrow({ where: { email: AKASH.email } })).passwordHash).toBe(before);
    // The real password still logs in.
    await login(AKASH.email, AKASH.password);
  });

  it("8. every write statement during Akash's session named only sbx_ tables", async () => {
    await db.$executeRawUnsafe("SET GLOBAL general_log = 0");
    const rows = await db.$queryRawUnsafe<{ argument: Buffer | string }[]>(
      "SELECT argument FROM mysql.general_log WHERE command_type IN ('Query', 'Execute')"
    );
    const writes = rows
      .map((r) => r.argument.toString())
      .filter((s) => /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(s))
      .filter((s) => !/mysql\.general_log/i.test(s));
    expect(writes.length).toBeGreaterThan(0); // the checks above did write
    const offenders = writes.filter((s) => {
      try {
        assertNoRealTables(s, MODEL_TABLES);
        return false;
      } catch {
        return true;
      }
    });
    expect(offenders).toEqual([]);
  });

  it("5. every real table is unchanged after Akash's session", async () => {
    expect(await checksums()).toEqual(checksumsBefore);
  });

  it("4. an admin's edit reaches Akash after the next refresh (snapshot by design)", async () => {
    const r = await admin(`/api/masters/customers/${fx.adminC}`, { method: "PATCH", body: JSON.stringify({ name: "ADMIN EDIT" }) });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    // Read the admin side from the DB: the admin's own list comes through the
    // shared master cache, which can serve the pre-edit entry once after
    // invalidation (existing behaviour, unrelated to the sandbox).
    expect((await db.customerMaster.findUniqueOrThrow({ where: { id: fx.adminC } })).name).toBe("ADMIN EDIT");
    expect((await names(akash)).get(fx.adminC)).not.toBe("ADMIN EDIT");
    await refreshSandboxCopy(DB_URL!);
    expect((await names(akash)).get(fx.adminC)).toBe("ADMIN EDIT");
  });

  it("7. Reset Sandbox brings back pure real data", async () => {
    // Make a fresh sandbox change, then reset through Akash's own button endpoint.
    await akash(`/api/masters/customers/${fx.editC}`, { method: "PATCH", body: JSON.stringify({ name: "SANDBOX EDIT 2" }) });
    // Check 4 refreshed seconds ago: the cooldown (3 s here, 2 min in
    // production) must refuse first.
    expect((await akash("/api/sandbox", { method: "POST" })).status).toBe(429);
    await new Promise((res) => setTimeout(res, 3500));
    const r = await akash("/api/sandbox", { method: "POST" });
    expect(r.status, await r.clone().text()).toBe(200);
    // Compared with the DB, not the admin's list — see the cache note in check 4.
    const mine = await names(akash);
    const { companyId } = await db.customerMaster.findUniqueOrThrow({ where: { id: fx.editC } });
    const real = new Map(
      (await db.customerMaster.findMany({ where: { companyId }, select: { id: true, name: true } })).map((c) => [c.id, c.name])
    );
    expect(mine).toEqual(real);
    expect(mine.has(fx.deleteC)).toBe(true);
    expect(mine.has(fx.created)).toBe(false);
  });

  it("the reset endpoint refuses a normal user", async () => {
    expect((await admin("/api/sandbox", { method: "POST" })).status).toBe(403);
  });
});
