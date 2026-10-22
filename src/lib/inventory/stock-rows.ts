// Turns stock lines (from the add form or an uploaded inventory sheet) into
// InventoryStock rows, and reports what could not be used.
//
// Pure: no database, no request objects. The routes decide what to write.

import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export type MtcType = "MTC_3_1" | "MTC_3_2";

export interface StockRow {
  form: string | null;
  product: string;
  specification: string | null;
  additionalSpec: string | null;
  dimensionStd: string | null;
  sizeLabel: string | null;
  ends: string | null;
  length: string | null;
  heatNo: string;
  make: string | null;
  quantityMtr: number;
  pieces: number;
  mtcNo: string | null;
  mtcDate: Date | null;
  mtcType: MtcType | null;
  tpiAgency: string | null;
  rackNo: string | null;
  notes: string | null;
}

export type NormalizeResult =
  | { ok: true; row: StockRow; warnings: string[] }
  | { ok: false; error: string };

// Sheet header (lower-cased, whitespace collapsed) -> field name.
// Unknown headers are ignored. "Location" in the sheet is the rack number.
const SHEET_COLUMNS: Record<string, string> = {
  form: "form",
  product: "product",
  specification: "specification",
  additional: "additionalSpec",
  dimension: "dimensionStd",
  size: "sizeLabel",
  ends: "ends",
  "length (mtr.)": "length",
  "heat no.": "heatNo",
  make: "make",
  "quantity (mtr.)": "quantityMtr",
  piece: "pieces",
  "mtc no.": "mtcNo",
  "mtc date": "mtcDate",
  "mtc type": "mtcType",
  tpi: "tpiAgency",
  location: "rackNo",
  notes: "notes",
};

// Excel-style cell value -> trimmed text, or null for empty and "-".
function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return String(v);
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" || s === "-" ? null : s;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = text(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// dd-mm-yy, dd/mm/yyyy, dd.mm.yy or yyyy-mm-dd. Anything else (ranges such as
// "20-03-26 & 11-03-26") returns null and the caller keeps the raw text.
export function parseLooseDate(s: string): Date | null {
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (dmy) {
    d = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

function mtcTypeOf(v: unknown): MtcType | null {
  const s = (text(v) ?? "").toUpperCase().replace(/\s+/g, "");
  if (s === "3.1MTC" || s === "3.1" || s === "MTC_3_1") return "MTC_3_1";
  if (s === "3.2MTC" || s === "3.2" || s === "MTC_3_2") return "MTC_3_2";
  return null;
}

// Validate and shape one stock line. Accepts the form's JSON (camel-case keys,
// numbers or numeric strings) and the sheet's values after fromSheetRow().
export function normalizeStockRow(raw: Record<string, unknown>): NormalizeResult {
  const product = text(raw.product);
  if (!product) return { ok: false, error: "Product is required" };

  const heatNo = text(raw.heatNo);
  if (!heatNo) return { ok: false, error: "Heat number is required" };

  const quantityMtr = num(raw.quantityMtr);
  if (quantityMtr === null || quantityMtr <= 0) {
    return { ok: false, error: "Quantity (Mtr.) must be greater than 0" };
  }

  const pieces = num(raw.pieces) ?? 0;
  if (!Number.isInteger(pieces) || pieces < 0) {
    return { ok: false, error: "Pieces must be a whole number, 0 or more" };
  }

  const warnings: string[] = [];
  const notes: string[] = [];
  const noteText = text(raw.notes);
  if (noteText) notes.push(noteText);

  let mtcDate: Date | null = null;
  if (raw.mtcDate instanceof Date && !Number.isNaN(raw.mtcDate.getTime())) {
    // xlsx gives local midnight for a sheet date; take its calendar day so a
    // timezone east of UTC does not move it back to the day before.
    const d = raw.mtcDate;
    mtcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  } else {
    const dateText = text(raw.mtcDate);
    if (dateText) {
      mtcDate = parseLooseDate(dateText);
      if (!mtcDate) {
        warnings.push(`MTC date "${dateText}" is not a single date; left empty`);
        notes.push(`MTC date (as given): ${dateText}`);
      }
    }
  }

  const mtcType = mtcTypeOf(raw.mtcType);
  const mtcTypeText = text(raw.mtcType);
  if (!mtcType && mtcTypeText) {
    warnings.push(`MTC type "${mtcTypeText}" is not 3.1 or 3.2; left empty`);
    notes.push(`MTC type (as given): ${mtcTypeText}`);
  }

  // Excel stores a plain number like 6.00 as a time when the cell is formatted
  // that way; a fraction of a day (0 < x < 1) is a time, not a length.
  let length = text(raw.length);
  if (typeof raw.length === "number" && raw.length > 0 && raw.length < 1) {
    const mins = Math.round(raw.length * 24 * 60);
    length = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
    warnings.push(`Length "${raw.length}" read as a time (${length}); check the value`);
    notes.push(`Length (as given): ${length}`);
  }

  return {
    ok: true,
    warnings,
    row: {
      form: text(raw.form),
      product,
      specification: text(raw.specification),
      additionalSpec: text(raw.additionalSpec),
      dimensionStd: text(raw.dimensionStd),
      sizeLabel: text(raw.sizeLabel),
      ends: text(raw.ends),
      length,
      heatNo,
      make: text(raw.make),
      quantityMtr: Math.round(quantityMtr * 1000) / 1000,
      pieces,
      mtcNo: text(raw.mtcNo),
      mtcDate,
      mtcType,
      tpiAgency: text(raw.tpiAgency),
      rackNo: text(raw.rackNo),
      notes: notes.length ? notes.join("; ") : null,
    },
  };
}

// Sheet row (header text -> cell value) to the camel-case shape above.
export function fromSheetRow(sheetRow: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(sheetRow)) {
    const field = SHEET_COLUMNS[header.replace(/\s+/g, " ").trim().toLowerCase()];
    if (field) out[field] = value;
  }
  return out;
}

// Identity of a stock line for duplicate detection. Same heat on another rack
// is a different line; so is the same heat and rack with another size.
export function stockKey(row: Pick<StockRow, "heatNo" | "mtcNo" | "sizeLabel" | "rackNo">): string {
  return [row.heatNo, row.mtcNo, row.sizeLabel, row.rackNo]
    .map((v) => (v ?? "").toLowerCase())
    .join("|");
}

export interface ImportIssue {
  line: number;
  error: string;
}

export interface ImportPlan {
  total: number;
  toCreate: StockRow[];
  duplicates: { line: number; key: string }[];
  issues: ImportIssue[];
  warnings: { line: number; text: string }[];
}

// Decide what an import would write. `existingKeys` holds stockKey() of rows
// already in the database for this company.
export function planStockImport(
  sheetRows: Record<string, unknown>[],
  existingKeys: Set<string>
): ImportPlan {
  const plan: ImportPlan = { total: sheetRows.length, toCreate: [], duplicates: [], issues: [], warnings: [] };
  const seen = new Set(existingKeys);

  sheetRows.forEach((sheetRow, i) => {
    const line = i + 2; // header is line 1
    if (Object.values(sheetRow).every((v) => v === null || v === undefined || v === "")) return;
    const result = normalizeStockRow(fromSheetRow(sheetRow));
    if (!result.ok) {
      plan.issues.push({ line, error: result.error });
      return;
    }
    for (const w of result.warnings) plan.warnings.push({ line, text: w });

    const key = stockKey(result.row);
    if (seen.has(key)) {
      plan.duplicates.push({ line, key });
      return;
    }
    seen.add(key);
    plan.toCreate.push(result.row);
  });

  return plan;
}

// Excel cell -> plain value. Formulas give their result, rich text its text.
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    return null;
  }
  return v;
}

// Read the first sheet of an uploaded .xlsx or .csv file. Blank rows are kept so
// that line numbers match the sheet; planStockImport skips them.
// exceljs reads UTC midnight for a date cell; take its calendar day so the
// local-date rule in normalizeStockRow gives the same day in any timezone.
export async function readStockSheet(buf: Buffer, fileName = ""): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  if (/\.csv$/i.test(fileName)) {
    await wb.csv.read(Readable.from(buf));
  } else {
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  }
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = String(cellValue(cell.value) ?? "").trim();
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, col) => {
      if (!h) return;
      let v = cellValue(row.getCell(col).value);
      if (v instanceof Date) v = new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
      obj[h] = v;
    });
    rows.push(obj);
  });
  return rows;
}
