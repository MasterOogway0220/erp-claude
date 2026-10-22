import { describe, it, expect } from "vitest";
import { normalizeStockRow, planStockImport, parseLooseDate, stockKey } from "./stock-rows";

const base = {
  product: "C.S. SEAMLESS PIPE",
  heatNo: "1557P",
  quantityMtr: 31.5,
  pieces: 4,
  sizeLabel: '2" NB X SCH 80',
  rackNo: "7",
};

describe("normalizeStockRow", () => {
  it("rejects a line without product, heat or positive quantity", () => {
    expect(normalizeStockRow({ ...base, product: "" })).toMatchObject({ ok: false });
    expect(normalizeStockRow({ ...base, heatNo: " - " })).toMatchObject({ ok: false });
    expect(normalizeStockRow({ ...base, quantityMtr: 0 })).toMatchObject({ ok: false });
    expect(normalizeStockRow({ ...base, quantityMtr: "abc" })).toMatchObject({ ok: false });
  });

  it("accepts numeric strings from the form and rounds float noise in quantity", () => {
    const r = normalizeStockRow({ ...base, quantityMtr: "1575.8499999999995", pieces: "262" });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.row.quantityMtr).toBe(1575.85);
      expect(r.row.pieces).toBe(262);
    }
  });

  it("keeps a numeric heat number as text", () => {
    const r = normalizeStockRow({ ...base, heatNo: 3524685 });
    expect(r.ok && r.row.heatNo).toBe("3524685");
  });

  it("keeps a compound rack value verbatim", () => {
    const r = normalizeStockRow({ ...base, rackNo: "8 & 11" });
    expect(r.ok && r.row.rackNo).toBe("8 & 11");
  });

  it("maps MTC type 3.1 and 3.2, and keeps other MTC types in notes with a warning", () => {
    const a = normalizeStockRow({ ...base, mtcType: "3.2 MTC" });
    expect(a.ok && a.row.mtcType).toBe("MTC_3_2");

    const b = normalizeStockRow({ ...base, mtcType: "IBR - IIIA" });
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.row.mtcType).toBeNull();
      expect(b.row.notes).toContain("MTC type (as given): IBR - IIIA");
      expect(b.warnings).toHaveLength(1);
    }
  });

  it("keeps the calendar day of an Excel date, whatever the server timezone", () => {
    const r = normalizeStockRow({ ...base, mtcDate: new Date(2023, 4, 4) });
    expect(r.ok && r.row.mtcDate?.toISOString().slice(0, 10)).toBe("2023-05-04");
  });

  it("parses a single date and keeps a date range as text in notes", () => {
    const ok = normalizeStockRow({ ...base, mtcDate: "20-03-26" });
    expect(ok.ok && ok.row.mtcDate?.toISOString()).toBe("2026-03-20T00:00:00.000Z");

    const range = normalizeStockRow({ ...base, mtcDate: "20-03-26 & 11-03-26" });
    expect(range.ok).toBe(true);
    if (range.ok) {
      expect(range.row.mtcDate).toBeNull();
      expect(range.row.notes).toContain("MTC date (as given): 20-03-26 & 11-03-26");
    }
  });

  it("reads a fractional length as a time and warns", () => {
    const r = normalizeStockRow({ ...base, length: 0.25 });
    expect(r.ok && r.row.length).toBe("6:00");
    expect(r.ok && r.warnings[0]).toMatch(/read as a time/);
  });

  it("treats a dash in optional text as empty", () => {
    const r = normalizeStockRow({ ...base, tpiAgency: "-", notes: "-" });
    expect(r.ok && r.row.tpiAgency).toBeNull();
    expect(r.ok && r.row.notes).toBeNull();
  });
});

describe("parseLooseDate", () => {
  it("rejects impossible dates", () => {
    expect(parseLooseDate("31-02-26")).toBeNull();
  });
  it("accepts dd/mm/yyyy and yyyy-mm-dd", () => {
    expect(parseLooseDate("18/09/2018")?.toISOString()).toBe("2018-09-18T00:00:00.000Z");
    expect(parseLooseDate("2026-05-25")?.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });
});

describe("planStockImport", () => {
  const sheet = (rows: Record<string, unknown>[]) => rows;
  const line = (over: Record<string, unknown>) => ({
    Product: "C.S. SEAMLESS PIPE",
    "Size ": '2" NB X SCH 80',
    "Heat No.": "1557P",
    "Quantity\n(Mtr.)": 10,
    Piece: 1,
    "MTC No.": "TV334371",
    Location: "7",
    ...over,
  });

  it("keeps the same heat on two racks as two rows", () => {
    const plan = planStockImport(
      sheet([line({ Location: 7 }), line({ Location: 9 })]),
      new Set()
    );
    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toCreate.map((r) => r.rackNo)).toEqual(["7", "9"]);
    expect(plan.duplicates).toHaveLength(0);
  });

  it("skips a line whose heat, MTC, size and rack already exist", () => {
    const existing = new Set([stockKey({ heatNo: "1557P", mtcNo: "TV334371", sizeLabel: '2" NB X SCH 80', rackNo: "7" })]);
    const plan = planStockImport(sheet([line({})]), existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.duplicates).toHaveLength(1);
  });

  it("reports a bad line with its sheet line number and keeps going", () => {
    const plan = planStockImport(sheet([line({ "Heat No.": null }), line({ Location: 9 })]), new Set());
    expect(plan.issues).toEqual([{ line: 2, error: "Heat number is required" }]);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].rackNo).toBe("9");
  });
});
