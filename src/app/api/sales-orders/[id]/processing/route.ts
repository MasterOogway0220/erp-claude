import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

/**
 * The ndtTests / requiredLabTests columns are String? (@db.LongText) but the
 * UI works with string[]. Serialize arrays to a JSON string for storage
 * (empty array -> null) and parse them back to arrays on read.
 */
function serializeStringArray(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : null;
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  return null;
}

function parseStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: {
        id: true,
        soNo: true,
        processingStatus: true,
        customer: { select: { name: true } },
        items: {
          orderBy: { sNo: "asc" },
          include: {
            orderProcessing: {
              include: {
                processedBy: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      salesOrder: {
        id: salesOrder.id,
        soNo: salesOrder.soNo,
        processingStatus: salesOrder.processingStatus,
        customerName: salesOrder.customer.name,
      },
      items: salesOrder.items.map((item) => ({
        salesOrderItem: {
          id: item.id,
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          uom: item.uom,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
          allotmentSource: item.allotmentSource,
          allotmentStatus: item.allotmentStatus,
          stockAllocQty: item.stockAllocQty ? Number(item.stockAllocQty) : null,
          procurementAllocQty: item.procurementAllocQty ? Number(item.procurementAllocQty) : null,
        },
        processing: item.orderProcessing
          ? {
              ...item.orderProcessing,
              ndtTests: parseStringArray(item.orderProcessing.ndtTests),
              requiredLabTests: parseStringArray(
                item.orderProcessing.requiredLabTests
              ),
              processedBy: item.orderProcessing.processedBy?.name || null,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching processing items:", error);
    return NextResponse.json({ error: "Failed to fetch processing data" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { salesOrderItemId, ...processingData } = body;

    if (!salesOrderItemId) {
      return NextResponse.json({ error: "salesOrderItemId is required" }, { status: 400 });
    }

    // Validate item belongs to this SO
    const soItem = await prisma.salesOrderItem.findFirst({
      where: { id: salesOrderItemId, salesOrderId: id },
    });

    if (!soItem) {
      return NextResponse.json({ error: "Item does not belong to this Sales Order" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "No active company selected for this session" },
        { status: 400 }
      );
    }

    // Upsert processing config
    const result = await prisma.orderProcessingItem.upsert({
      where: { salesOrderItemId },
      create: {
        salesOrderItemId,
        companyId: companyId!,
        poSlNo: processingData.poSlNo || null,
        poItemCode: processingData.poItemCode || null,
        colourCodingRequired: processingData.colourCodingRequired || false,
        colourCode: processingData.colourCode || null,
        additionalPipeSpec: processingData.additionalPipeSpec || null,
        hotDipGalvanising: processingData.hotDipGalvanising || false,
        screwedEnds: processingData.screwedEnds || false,
        coatingRequired: processingData.coatingRequired || false,
        coatingType: processingData.coatingType || null,
        coatingSide: processingData.coatingSide || null,
        tpiRequired: processingData.tpiRequired || false,
        tpiType: processingData.tpiType || null,
        labTestingRequired: processingData.labTestingRequired || false,
        pmiRequired: processingData.pmiRequired || false,
        pmiType: processingData.pmiType || null,
        ndtRequired: processingData.ndtRequired || false,
        ndtTests: serializeStringArray(processingData.ndtTests),
        vdiRequired: processingData.vdiRequired || false,
        vdiWitnessPercent: processingData.vdiWitnessPercent ?? null,
        hydroTestRequired: processingData.hydroTestRequired || false,
        hydroWitnessPercent: processingData.hydroWitnessPercent ?? null,
        requiredLabTests: serializeStringArray(processingData.requiredLabTests),
      },
      update: {
        poSlNo: processingData.poSlNo || null,
        poItemCode: processingData.poItemCode || null,
        colourCodingRequired: processingData.colourCodingRequired || false,
        colourCode: processingData.colourCode || null,
        additionalPipeSpec: processingData.additionalPipeSpec || null,
        hotDipGalvanising: processingData.hotDipGalvanising || false,
        screwedEnds: processingData.screwedEnds || false,
        coatingRequired: processingData.coatingRequired || false,
        coatingType: processingData.coatingType || null,
        coatingSide: processingData.coatingSide || null,
        tpiRequired: processingData.tpiRequired || false,
        tpiType: processingData.tpiType || null,
        labTestingRequired: processingData.labTestingRequired || false,
        pmiRequired: processingData.pmiRequired || false,
        pmiType: processingData.pmiType || null,
        ndtRequired: processingData.ndtRequired || false,
        ndtTests: serializeStringArray(processingData.ndtTests),
        vdiRequired: processingData.vdiRequired || false,
        vdiWitnessPercent: processingData.vdiWitnessPercent ?? null,
        hydroTestRequired: processingData.hydroTestRequired || false,
        hydroWitnessPercent: processingData.hydroWitnessPercent ?? null,
        requiredLabTests: serializeStringArray(processingData.requiredLabTests),
      },
    });

    // Update SO processingStatus if needed
    const allItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
      include: { orderProcessing: { select: { status: true } } },
    });

    const processedCount = allItems.filter(
      (i) => i.orderProcessing?.status === "PROCESSED"
    ).length;

    let newStatus = "UNPROCESSED";
    if (processedCount === allItems.length) {
      newStatus = "PROCESSED";
    } else if (processedCount > 0) {
      newStatus = "PROCESSING";
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { processingStatus: newStatus },
    });

    return NextResponse.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Error saving processing item:", error);
    return NextResponse.json(
      { error: "Failed to save processing data", detail },
      { status: 500 }
    );
  }
}
