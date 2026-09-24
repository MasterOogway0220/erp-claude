// Runs only against a disposable database:
//   SANDBOX_TEST_DATABASE_URL=mysql://root:localroot@127.0.0.1:3307/erp_local npx vitest run src/lib/sandbox/sandbox.db.test.ts
// It creates sbx_* tables and fixture rows there. Never point it at production.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { poolConfig } from "@/lib/prisma";
import { sandboxAdapter } from "./adapter";
import { MODEL_TABLES } from "./tables";
import { RefreshBusyError, lastRefreshAt, refreshSandboxCopy } from "./refresh";

const URL_ = process.env.SANDBOX_TEST_DATABASE_URL;

describe.skipIf(!URL_)("sandbox copy + client (local DB)", () => {
  let real: PrismaClient;
  let sbx: PrismaClient;
  let checksumsBefore: Record<string, string>;
  const ids = { customer: "", quotation: "", company: "" };

  async function realChecksums(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const t of MODEL_TABLES) {
      const [row] = await real.$queryRawUnsafe<{ Checksum: bigint }[]>(`CHECKSUM TABLE \`${t}\``);
      const [{ n }] = await real.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) n FROM \`${t}\``);
      out[t] = `${row.Checksum}/${n}`;
    }
    return out;
  }

  beforeAll(async () => {
    if (!/127\.0\.0\.1|localhost/.test(URL_!)) throw new Error("refusing: SANDBOX_TEST_DATABASE_URL is not local");
    real = new PrismaClient({ adapter: new PrismaMariaDb({ ...poolConfig(URL_!), connectionLimit: 3 }) });
    sbx = new PrismaClient({ adapter: sandboxAdapter(new PrismaMariaDb({ ...poolConfig(URL_!), connectionLimit: 2 }), MODEL_TABLES) });

    const company = await real.companyMaster.findFirstOrThrow();
    ids.company = company.id;
    const customer = await real.customerMaster.create({ data: { name: "DBTEST Customer", companyId: company.id } });
    ids.customer = customer.id;
    const q = await real.quotation.create({
      data: {
        quotationNo: `DBTEST-${Date.now()}`,
        customerId: customer.id,
        companyId: company.id,
        items: { create: [{ sNo: 1, product: "Pipe", quantity: 10, unitRate: 5, amount: 50 }, { sNo: 2, product: "Elbow", quantity: 2, unitRate: 3, amount: 6 }] },
      },
    });
    ids.quotation = q.id;

    const res = await refreshSandboxCopy(URL_!);
    expect(res.tables).toBe(MODEL_TABLES.length);
    checksumsBefore = await realChecksums();
  }, 180_000);

  afterAll(async () => {
    await sbx?.$disconnect();
    await real?.$disconnect();
  });

  it("copies every model table with the same row count", async () => {
    for (const t of MODEL_TABLES) {
      const [{ a }] = await real.$queryRawUnsafe<{ a: bigint }[]>(`SELECT COUNT(*) a FROM \`${t}\``);
      const [{ b }] = await real.$queryRawUnsafe<{ b: bigint }[]>(`SELECT COUNT(*) b FROM \`sbx_${t}\``);
      expect(`${t}:${b}`).toBe(`${t}:${a}`);
    }
    expect(await lastRefreshAt(real)).toBeInstanceOf(Date);
  });

  it("edits land in the copy only", async () => {
    await sbx.customerMaster.update({ where: { id: ids.customer }, data: { name: "SBX edited" } });
    expect((await sbx.customerMaster.findUniqueOrThrow({ where: { id: ids.customer } })).name).toBe("SBX edited");
    expect((await real.customerMaster.findUniqueOrThrow({ where: { id: ids.customer } })).name).toBe("DBTEST Customer");
  });

  it("creates land in the copy only", async () => {
    const c = await sbx.customerMaster.create({ data: { name: "SBX new", companyId: ids.company } });
    expect(await sbx.customerMaster.count({ where: { id: c.id } })).toBe(1);
    expect(await real.customerMaster.count({ where: { id: c.id } })).toBe(0);
  });

  it("the quotation save shape (tx: delete items, nested re-create) stays in the copy", async () => {
    await sbx.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: ids.quotation } });
      await tx.quotation.update({
        where: { id: ids.quotation },
        data: { items: { create: [{ sNo: 1, product: "SBX Flange", quantity: 1, unitRate: 1, amount: 1 }] } },
      });
    });
    const s = await sbx.quotation.findUniqueOrThrow({ where: { id: ids.quotation }, include: { items: true, _count: { select: { items: true } } } });
    expect(s.items.map((i) => i.product)).toEqual(["SBX Flange"]);
    expect(await real.quotationItem.count({ where: { quotationId: ids.quotation } })).toBe(2);
  });

  it("raw unquoted SQL (the stock-reserve shape) reads the copy", async () => {
    await sbx.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM CustomerMaster WHERE id = ${ids.customer} FOR UPDATE`;
      expect(rows).toHaveLength(1);
    });
  });

  it("deletes cascade inside the copy, real rows survive", async () => {
    await sbx.quotation.delete({ where: { id: ids.quotation } });
    expect(await sbx.quotationItem.count({ where: { quotationId: ids.quotation } })).toBe(0);
    expect(await real.quotation.count({ where: { id: ids.quotation } })).toBe(1);
    expect(await real.quotationItem.count({ where: { quotationId: ids.quotation } })).toBe(2);
  });

  it("aggregates and groupBy run on the copy", async () => {
    const a = await sbx.quotationItem.aggregate({ _sum: { amount: true } });
    const g = await sbx.customerMaster.groupBy({ by: ["companyId"], _count: true });
    expect(a).toBeTruthy();
    expect(g.length).toBeGreaterThan(0);
  });

  it("leaves every real table byte-for-byte unchanged", async () => {
    expect(await realChecksums()).toEqual(checksumsBefore);
  });

  it("refuses a second refresh while one is running", async () => {
    const results = await Promise.allSettled([refreshSandboxCopy(URL_!), refreshSandboxCopy(URL_!)]);
    const busy = results.filter((r) => r.status === "rejected" && r.reason instanceof RefreshBusyError);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(busy).toHaveLength(1);
    expect(await lastRefreshAt(real)).toBeInstanceOf(Date);
  }, 180_000);

  it("a second refresh wipes sandbox changes", async () => {
    await refreshSandboxCopy(URL_!);
    expect((await sbx.customerMaster.findUniqueOrThrow({ where: { id: ids.customer } })).name).toBe("DBTEST Customer");
    expect(await sbx.quotationItem.count({ where: { quotationId: ids.quotation } })).toBe(2);
  }, 180_000);
});
