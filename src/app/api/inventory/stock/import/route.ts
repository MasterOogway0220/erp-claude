import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";
import { fromSheetRow, planStockImport, readStockSheet } from "@/lib/inventory/stock-rows";
import { createStockRows, existingStockKeys } from "@/lib/inventory/stock-write";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 2000;

// Multipart upload: `file` (.xlsx/.xls/.csv) and `dryRun`.
// dryRun defaults to true: nothing is written unless the client sends dryRun=false.
export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inventory", "write");
    if (!authorized) return response!;
    if (!companyId) {
      return NextResponse.json({ error: "Select an active company before importing stock" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to import" }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "File is larger than 5 MB" }, { status: 400 });
    }
    const dryRun = form.get("dryRun") !== "false";

    const sheetRows = readStockSheet(Buffer.from(await file.arrayBuffer()));
    if (sheetRows.length === 0) {
      return NextResponse.json({ error: "The file has no data rows" }, { status: 400 });
    }
    if (sheetRows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `A file may hold at most ${MAX_IMPORT_ROWS} rows` }, { status: 400 });
    }

    const heats = sheetRows.map((r) => String(fromSheetRow(r).heatNo ?? "").trim());
    const existing = await existingStockKeys(companyId, heats);
    const plan = planStockImport(sheetRows, existing);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        total: plan.total,
        willCreate: plan.toCreate.length,
        duplicates: plan.duplicates,
        issues: plan.issues,
        warnings: plan.warnings,
        preview: plan.toCreate.slice(0, 10),
      });
    }

    const created = await createStockRows(companyId, plan.toCreate);

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InventoryStock",
      recordId: file.name,
      newValue: JSON.stringify({ import: true, total: plan.total, created, duplicates: plan.duplicates.length, issues: plan.issues.length }),
    }).catch(console.error);

    return NextResponse.json({
      dryRun: false,
      total: plan.total,
      created,
      duplicates: plan.duplicates,
      issues: plan.issues,
      warnings: plan.warnings,
    });
  } catch (error) {
    console.error("Error importing stock:", error);
    return NextResponse.json({ error: "Failed to import stock" }, { status: 500 });
  }
}
