import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { LAB_TESTS } from "@/lib/constants/order-processing";

/**
 * Parse requiredLabTests from DB. Prisma stores a JS array sent by the
 * frontend as a JSON-encoded string in LongText, and returns it as a native
 * JS array on read. Guard against the unlikely raw-string edge case.
 */
function parseLabTests(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // CSV fallback
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * POST /api/sales-orders/[id]/processing/[itemId]/lab-letter
 *
 * Generates a DRAFT LabLetter from the OrderProcessingItem attached to the
 * SalesOrderItem identified by [itemId] within SalesOrder [id].
 *
 * Returns { id, letterNo } on success.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { authorized, session, response, companyId } = await checkAccess(
    "labLetter",
    "write",
  );
  if (!authorized) return response!;

  const { id: salesOrderId, itemId } = await params;

  try {
    // Fetch SO item with its processing record and parent SO/customer
    const soItem = await prisma.salesOrderItem.findFirst({
      where: { id: itemId, salesOrderId },
      include: {
        orderProcessing: true,
        salesOrder: {
          include: { customer: true },
        },
      },
    });

    if (!soItem) {
      return NextResponse.json(
        { error: "Sales order item not found" },
        { status: 404 },
      );
    }

    if (!soItem.orderProcessing) {
      return NextResponse.json(
        { error: "Processing record not found for this item" },
        { status: 404 },
      );
    }

    const proc = soItem.orderProcessing;

    // --- Parse required lab tests ----------------------------------------
    const testValues = parseLabTests(proc.requiredLabTests);
    if (testValues.length === 0) {
      return NextResponse.json(
        { error: "No lab tests specified for this item" },
        { status: 400 },
      );
    }

    // Map constant values → human-readable labels
    const labelByValue = new Map(LAB_TESTS.map((t) => [t.value, t.label]));
    const testNames = testValues.map(
      (v) => labelByValue.get(v as keyof typeof labelByValue extends never ? never : any) ?? v,
    );

    // Best-effort: resolve TestingMaster ids by test name
    const matched = await prisma.testingMaster.findMany({
      where: { testName: { in: testNames } },
      select: { id: true },
    });
    const testIds: string[] = matched.map((m) => m.id);

    // --- Create DRAFT LabLetter ------------------------------------------
    const letterNo = await generateDocumentNumber("LAB_LETTER", companyId);

    const letter = await prisma.labLetter.create({
      data: {
        letterNo,
        companyId,
        status: "DRAFT",
        // heat number may not be set yet at this stage
        heatNo: soItem.heatNo ?? null,
        // customer / PO context from parent SO
        clientName: soItem.salesOrder.customer?.name ?? null,
        poNumber: soItem.salesOrder.customerPoNo ?? null,
        // product details from SO item
        productDescription: soItem.product ?? null,
        specification: soItem.material ?? null,
        sizeLabel: soItem.sizeLabel ?? null,
        quantity:
          soItem.quantity != null ? String(soItem.quantity) : null,
        // item code from processing record
        itemCode: proc.poItemCode ?? null,
        // witness required when TPI type involves client/QA witness
        witnessRequired: proc.tpiType === "TPI_CLIENT_QA",
        // store as native arrays — Prisma serialises to JSON in LongText
        testIds: testIds.length > 0 ? (testIds as any) : null,
        testNames: testNames as any,
        generatedById: session.user.id,
      },
    });

    return NextResponse.json({ id: letter.id, letterNo: letter.letterNo });
  } catch (error) {
    console.error("lab-letter from processing error:", error);
    return NextResponse.json(
      { error: "Failed to generate lab letter" },
      { status: 500 },
    );
  }
}
