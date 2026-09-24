import { describe, expect, it } from "vitest";
import { SandboxSqlError, assertNoRealTables, toSandboxSql } from "./rewrite";

const TABLES = ["Quotation", "QuotationItem", "InventoryStock", "User"];
const r = (sql: string) => toSandboxSql(sql, TABLES);

describe("toSandboxSql", () => {
  it("renames backticked tables, including qualified columns", () => {
    expect(r("SELECT `Quotation`.`id` FROM `Quotation` WHERE `Quotation`.`id` = ?")).toBe(
      "SELECT `sbx_Quotation`.`id` FROM `sbx_Quotation` WHERE `sbx_Quotation`.`id` = ?"
    );
  });

  it("renames the table part of a schema-qualified name", () => {
    expect(r("SELECT * FROM `erp`.`QuotationItem`")).toBe("SELECT * FROM `erp`.`sbx_QuotationItem`");
  });

  it("renames bare table names in raw SQL", () => {
    expect(r("SELECT id FROM InventoryStock WHERE InventoryStock.id = ? FOR UPDATE")).toBe(
      "SELECT id FROM sbx_InventoryStock WHERE sbx_InventoryStock.id = ? FOR UPDATE"
    );
  });

  it("does not touch columns that merely contain a table name", () => {
    expect(r("UPDATE `QuotationItem` SET `quotationId` = ?, QuotationItemCount = 1")).toBe(
      "UPDATE `sbx_QuotationItem` SET `quotationId` = ?, QuotationItemCount = 1"
    );
  });

  it("leaves string literals alone", () => {
    expect(r("SELECT 'Quotation' AS a, \"User\" AS b FROM User")).toBe(
      "SELECT 'Quotation' AS a, \"User\" AS b FROM sbx_User"
    );
    expect(r("SELECT 'it''s Quotation' FROM `User`")).toBe("SELECT 'it''s Quotation' FROM `sbx_User`");
  });

  it("is idempotent on already-prefixed names", () => {
    const once = r("SELECT * FROM `Quotation` JOIN User ON 1=1");
    expect(r(once)).toBe(once);
  });

  it("refuses SQL comments, which could hide a table name from the scanner", () => {
    // A quote inside a comment would open a phantom string literal, and
    // MariaDB executes /*! ... */ and /*M! ... */ comments as SQL.
    for (const sql of [
      "SELECT 1 -- don't\nFROM Quotation",
      "SELECT 1 # it's\nFROM Quotation",
      "SELECT /* it's */ 1 FROM Quotation",
      "SELECT 1 /*!50000 FROM Quotation */",
    ]) {
      expect(() => r(sql), sql).toThrow(SandboxSqlError);
    }
  });

  it("allows comment-like text inside string literals", () => {
    expect(r("SELECT '-- # /* */' FROM `User`")).toBe("SELECT '-- # /* */' FROM `sbx_User`");
  });

  it("passes SQL with no tables through unchanged", () => {
    expect(r("SELECT 1")).toBe("SELECT 1");
  });

});

describe("assertNoRealTables", () => {
  it("refuses a statement that still names a real table, quoted or bare", () => {
    expect(() => assertNoRealTables("SELECT * FROM `Quotation`", TABLES)).toThrow(SandboxSqlError);
    expect(() => assertNoRealTables("DELETE FROM User", TABLES)).toThrow(SandboxSqlError);
  });

  it("accepts sandbox names and literals that mention real names", () => {
    expect(() => assertNoRealTables("SELECT 'Quotation' FROM `sbx_Quotation`", TABLES)).not.toThrow();
  });
});
