import { describe, expect, it } from "vitest";
import { refreshStatements, type Fk } from "./refresh";

const FKS: Fk[] = [
  { name: "QuotationItem_quotationId_fkey", child: "QuotationItem", parent: "Quotation", cols: ["quotationId"], refCols: ["id"], onDelete: "CASCADE", onUpdate: "CASCADE" },
  { name: "Quotation_customerId_fkey", child: "Quotation", parent: "CustomerMaster", cols: ["customerId"], refCols: ["id"], onDelete: "RESTRICT", onUpdate: "CASCADE" },
  { name: "X".repeat(64), child: "Quotation", parent: "Quotation", cols: ["parentQuotationId"], refCols: ["id"], onDelete: "SET NULL", onUpdate: "CASCADE" },
];
const TABLES = ["CustomerMaster", "Quotation", "QuotationItem"];

// The identifier a statement writes to: the table after DROP TABLE IF EXISTS /
// CREATE TABLE / INSERT INTO / ALTER TABLE.
function writtenTable(sql: string): string {
  const m = /^(?:DROP TABLE IF EXISTS|CREATE TABLE|INSERT INTO|ALTER TABLE) `([^`]+)`/.exec(sql);
  if (!m) throw new Error(`unrecognised statement: ${sql}`);
  return m[1];
}

describe("refreshStatements", () => {
  const stmts = refreshStatements(TABLES, FKS);

  it("only ever writes to sbx_ tables", () => {
    for (const s of stmts) expect(writtenTable(s)).toMatch(/^sbx_/);
  });

  it("names real tables only as the source of LIKE or SELECT", () => {
    for (const s of stmts) {
      const realRefs = [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((n) => TABLES.includes(n));
      for (const n of realRefs) expect(s).toMatch(new RegExp(`(LIKE|FROM) \`${n}\`$`));
    }
  });

  it("removes the completion marker first and recreates it last", () => {
    // A refresh that dies part-way must not look fresh: lastRefreshAt reads
    // the marker, which only exists once every statement before it ran.
    expect(stmts[0]).toBe("DROP TABLE IF EXISTS `sbx__refreshed`");
    expect(stmts[stmts.length - 1]).toBe("CREATE TABLE `sbx__refreshed` (`id` INT)");
  });

  it("drops, recreates and copies every table, then adds foreign keys", () => {
    expect(stmts.slice(1, 4)).toEqual(TABLES.map((t) => `DROP TABLE IF EXISTS \`sbx_${t}\``));
    expect(stmts).toContain("CREATE TABLE `sbx_Quotation` LIKE `Quotation`");
    expect(stmts).toContain("INSERT INTO `sbx_Quotation` SELECT * FROM `Quotation`");
    const alter = stmts.find((s) => s.startsWith("ALTER TABLE `sbx_QuotationItem`"));
    expect(alter).toBe(
      "ALTER TABLE `sbx_QuotationItem` ADD CONSTRAINT `sbx_QuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `sbx_Quotation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    );
  });

  it("keeps constraint names within MySQL's 64 characters and unique", () => {
    const names = stmts.flatMap((s) => [...s.matchAll(/ADD CONSTRAINT `([^`]+)`/g)].map((m) => m[1]));
    expect(names).toHaveLength(3);
    for (const n of names) expect(n.length).toBeLessThanOrEqual(64);
    expect(new Set(names).size).toBe(names.length);
  });
});
