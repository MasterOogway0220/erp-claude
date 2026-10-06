import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { parseStringArray } from "@/lib/business-logic/technical-requirements";
import { wholePercent } from "@/lib/quality/witness-percent";

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

/**
 * One save can cover several sales-order lines. On a 30-line order where every
 * line carries the same inspection and testing regime, filling the same form 30
 * times is the single largest source of data-entry error in this step, so the
 * screen offers "apply to other items" and sends the extra ids here.
 */
function targetItemIds(body: Record<string, unknown>): string[] {
  const many = Array.isArray(body.salesOrderItemIds)
    ? (body.salesOrderItemIds as unknown[]).map(String).filter(Boolean)
    : [];
  const one = body.salesOrderItemId ? String(body.salesOrderItemId) : null;
  return Array.from(new Set(one ? [one, ...many] : many));
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
        // Order context shown above the processing form.
        customerPoNo: true,
        quotation: { select: { id: true, quotationNo: true } },
        clientPurchaseOrder: { select: { id: true, cpoNo: true } },
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
        customerPoNo: salesOrder.customerPoNo,
        quotation: salesOrder.quotation,
        clientPurchaseOrder: salesOrder.clientPurchaseOrder,
      },
      items: salesOrder.items.map((item) => ({
        salesOrderItem: {
          id: item.id,
          sNo: item.sNo,
          // Registered on the client PO and copied onto the SO line. The
          // processing form pre-fills from these rather than asking again.
          poSlNo: item.poSlNo,
          poItemCode: item.poItemCode,
          product: item.product,
          // A non-standard line's own words; its product reads only
          // "Non-Standard Item".
          itemDescription: item.itemDescription,
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
    const { salesOrderItemId, salesOrderItemIds, ...processingData } = body;

    const itemIds = targetItemIds(body);
    if (itemIds.length === 0) {
      return NextResponse.json({ error: "salesOrderItemId is required" }, { status: 400 });
    }

    // Every target item must belong to this SO — one bad id fails the whole
    // save rather than quietly writing the good ones.
    const soItems = await prisma.salesOrderItem.findMany({
      where: { id: { in: itemIds }, salesOrderId: id },
      select: { id: true },
    });

    if (soItems.length !== itemIds.length) {
      return NextResponse.json({ error: "Item does not belong to this Sales Order" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "No active company selected for this session" },
        { status: 400 }
      );
    }

    // The requirement set is shared by every target item. The PO references are
    // not: they are the client's own line number and item code, so they are
    // written only to the item the form was filled on.
    const shared = {
      colourCodingRequired: processingData.colourCodingRequired || false,
      colourCode: processingData.colourCode || null,
      additionalPipeSpec: processingData.additionalPipeSpec || null,
      additionalSpec: processingData.additionalSpec || null,
      hotDipGalvanising: processingData.hotDipGalvanising || false,
      screwedEnds: processingData.screwedEnds || false,
      coatingRequired: processingData.coatingRequired || false,
      coatingType: processingData.coatingType || null,
      coatingSide: processingData.coatingSide || null,
      tpiRequired: processingData.tpiRequired || false,
      tpiType: processingData.tpiType || null,
      labTestingRequired: processingData.labTestingRequired || false,
      // Who carries out the lab testing — separate from tpiType, which says
      // who inspects. An agency is kept only with TPI_AGENCY.
      labTestingBy: processingData.labTestingBy || null,
      labTestingAgencyId:
        processingData.labTestingBy === "TPI_AGENCY"
          ? processingData.labTestingAgencyId || null
          : null,
      pmiRequired: processingData.pmiRequired || false,
      pmiType: processingData.pmiType || null,
      ndtRequired: processingData.ndtRequired || false,
      ndtTests: serializeStringArray(processingData.ndtTests),
      vdiRequired: processingData.vdiRequired || false,
      vdiWitnessPercent: wholePercent(processingData.vdiWitnessPercent),
      hydroTestRequired: processingData.hydroTestRequired || false,
      hydroWitnessPercent: wholePercent(processingData.hydroWitnessPercent),
      requiredLabTests: serializeStringArray(processingData.requiredLabTests),
      otherLabTests: processingData.otherLabTests || null,
    };

    // Callback form: the sandbox router (the exported `prisma`) rejects the
    // array form for every user. Sequential, because an interactive
    // transaction holds one connection; the timeout covers "apply to all
    // items" on a long order over the remote MySQL.
    const written = await prisma.$transaction(
      async (tx) => {
        const rows = [];
        for (const targetId of itemIds) {
          const poRefs =
            targetId === salesOrderItemId
              ? {
                  poSlNo: processingData.poSlNo || null,
                  poItemCode: processingData.poItemCode || null,
                }
              : {};
          rows.push(
            await tx.orderProcessingItem.upsert({
              where: { salesOrderItemId: targetId },
              create: {
                salesOrderItemId: targetId,
                companyId: companyId!,
                ...poRefs,
                ...shared,
              },
              update: { ...poRefs, ...shared },
            })
          );
        }
        return rows;
      },
      { timeout: 20000 }
    );

    // The screen re-renders the item it was filled on, so return that one.
    const result =
      written.find((w) => w.salesOrderItemId === salesOrderItemId) ?? written[0];

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

    // Same shape as GET: the screen keeps this as the item's record. Sent as
    // the stored JSON text, the tests reloaded unticked and the next save
    // wrote them as NULL.
    return NextResponse.json({
      ...result,
      ndtTests: parseStringArray(result.ndtTests),
      requiredLabTests: parseStringArray(result.requiredLabTests),
      appliedToCount: written.length,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Error saving processing item:", error);
    return NextResponse.json(
      { error: "Failed to save processing data", detail },
      { status: 500 }
    );
  }
}
