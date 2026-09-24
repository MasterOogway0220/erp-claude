import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { poolConfig } from "@/lib/prisma";
import { SANDBOX_PREFIX } from "./rewrite";
import { MODEL_TABLES } from "./tables";

export interface Fk {
  name: string;
  child: string;
  parent: string;
  cols: string[];
  refCols: string[];
  onDelete: string;
  onUpdate: string;
}

const q = (name: string) => `\`${name}\``;
const sbx = (table: string) => q(SANDBOX_PREFIX + table);

// Exists only after a refresh ran to the end; its CREATE_TIME is the refresh
// time. Not a model table, so the sandbox client never renames it.
const MARKER = `${SANDBOX_PREFIX}_refreshed`;

/** Another refresh (the nightly cron or a reset) holds the lock. */
export class RefreshBusyError extends Error {
  constructor() {
    super("A sandbox refresh is already running");
    this.name = "RefreshBusyError";
  }
}

// MySQL identifiers max out at 64 characters. A prefixed name that would not
// fit is shortened with a hash of the original so it stays unique.
function constraintName(original: string): string {
  const name = SANDBOX_PREFIX + original;
  if (name.length <= 64) return name;
  const hash = createHash("sha1").update(original).digest("hex").slice(0, 8);
  return `${name.slice(0, 55)}_${hash}`;
}

/**
 * The statements that rebuild the sandbox copies, in order. Pure, so the one
 * property that matters — every written table starts with sbx_, real tables
 * appear only as the source of LIKE / SELECT — is unit-tested.
 */
export function refreshStatements(tables: readonly string[], fks: readonly Fk[]): string[] {
  const out: string[] = [`DROP TABLE IF EXISTS ${q(MARKER)}`];
  for (const t of tables) out.push(`DROP TABLE IF EXISTS ${sbx(t)}`);
  for (const t of tables) out.push(`CREATE TABLE ${sbx(t)} LIKE ${q(t)}`);
  for (const t of tables) out.push(`INSERT INTO ${sbx(t)} SELECT * FROM ${q(t)}`);
  // CREATE TABLE ... LIKE copies indexes but not foreign keys. Recreate them
  // between the copies so cascades and restricts behave as on real data.
  const byChild = new Map<string, Fk[]>();
  for (const fk of fks) byChild.set(fk.child, [...(byChild.get(fk.child) ?? []), fk]);
  for (const [child, list] of byChild) {
    const adds = list.map(
      (fk) =>
        `ADD CONSTRAINT ${q(constraintName(fk.name))} FOREIGN KEY (${fk.cols.map(q).join(", ")}) ` +
        `REFERENCES ${sbx(fk.parent)} (${fk.refCols.map(q).join(", ")}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`
    );
    out.push(`ALTER TABLE ${sbx(child)} ${adds.join(", ")}`);
  }
  out.push(`CREATE TABLE ${q(MARKER)} (\`id\` INT)`);
  return out;
}

async function readFks(db: PrismaClient, tables: readonly string[]): Promise<Fk[]> {
  const rows = await db.$queryRawUnsafe<
    { name: string; child: string; parent: string; onDelete: string; onUpdate: string; col: string; refCol: string }[]
  >(
    `SELECT rc.CONSTRAINT_NAME name, rc.TABLE_NAME child, rc.REFERENCED_TABLE_NAME parent,
            rc.DELETE_RULE onDelete, rc.UPDATE_RULE onUpdate, k.COLUMN_NAME col, k.REFERENCED_COLUMN_NAME refCol
       FROM information_schema.REFERENTIAL_CONSTRAINTS rc
       JOIN information_schema.KEY_COLUMN_USAGE k
         ON k.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND k.TABLE_NAME = rc.TABLE_NAME
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME, k.ORDINAL_POSITION`
  );
  const wanted = new Set(tables);
  const byName = new Map<string, Fk>();
  for (const r of rows) {
    // Skip the copies' own keys and anything outside the schema.
    if (!wanted.has(r.child) || !wanted.has(r.parent)) continue;
    const key = `${r.child}.${r.name}`;
    const fk = byName.get(key) ?? { name: r.name, child: r.child, parent: r.parent, cols: [], refCols: [], onDelete: r.onDelete, onUpdate: r.onUpdate };
    fk.cols.push(r.col);
    fk.refCols.push(r.refCol);
    byName.set(key, fk);
  }
  return [...byName.values()];
}

/**
 * Rebuilds every sbx_ copy from the real tables: structure, data and foreign
 * keys. Anything Akash changed since the last refresh is gone afterwards.
 *
 * Uses its own single-connection client because FOREIGN_KEY_CHECKS is a
 * session setting: tables are copied in schema order, not dependency order,
 * and the copies' keys are added last.
 */
export async function refreshSandboxCopy(databaseUrl: string): Promise<{ tables: number; ms: number }> {
  const started = Date.now();
  // multipleStatements: the ~400 statements go to the server as one script, so
  // the refresh costs one network round trip instead of one per statement —
  // the difference between seconds and minutes from Vercel to Hostinger.
  const db = new PrismaClient({
    adapter: new PrismaMariaDb({ ...poolConfig(databaseUrl), connectionLimit: 1, multipleStatements: true }),
  });
  try {
    // One refresh at a time across every instance: two interleaved rebuilds
    // would drop each other's half-built copies. The lock belongs to this
    // connection and is released when it closes, even if the script fails.
    const [{ got }] = await db.$queryRawUnsafe<{ got: bigint | number | null }[]>(
      "SELECT GET_LOCK('sbx_refresh', 0) AS got"
    );
    if (Number(got) !== 1) throw new RefreshBusyError();

    const fks = await readFks(db, MODEL_TABLES);
    const script = [
      // READ COMMITTED: INSERT ... SELECT then reads the real tables as a
      // consistent snapshot, taking no locks on real rows. (Production's
      // default already, 2026-09-24 — set here so it cannot drift.)
      "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED",
      "SET SESSION FOREIGN_KEY_CHECKS = 0",
      ...refreshStatements(MODEL_TABLES, fks),
      "SET SESSION FOREIGN_KEY_CHECKS = 1",
    ].join(";\n");
    await db.$executeRawUnsafe(script);
    return { tables: MODEL_TABLES.length, ms: Date.now() - started };
  } finally {
    await db.$disconnect();
  }
}

/**
 * When the copies were last completely rebuilt, or null if never — or if the
 * last attempt did not finish (the marker is dropped first, created last).
 */
export async function lastRefreshAt(db: PrismaClient): Promise<Date | null> {
  // The age is computed on the server (CREATE_TIME and NOW() in the same
  // zone): CREATE_TIME is a zone-less DATETIME in the server's local time, and
  // reading it directly into a JS Date can be off by the zone offset.
  const rows = await db.$queryRawUnsafe<{ age: bigint | number | null }[]>(
    "SELECT TIMESTAMPDIFF(SECOND, CREATE_TIME, NOW()) age FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    MARKER
  );
  const age = rows[0]?.age;
  return age == null ? null : new Date(Date.now() - Number(age) * 1000);
}
