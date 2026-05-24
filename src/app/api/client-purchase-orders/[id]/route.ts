import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("clientPO", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const clientPO = await prisma.clientPurchaseOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          select: {
            id: true,
            quotationNo: true,
            quotationDate: true,
            currency: true,
            subtotal: true,
            grandTotal: true,
          },
        },
        createdBy: { select: { name: true } },
        poAcceptance: { select: { id: true, acceptanceNo: true, status: true } },
        items: {
          include: {
            quotationItem: {
              select: {
                id: true,
                quantity: true,
                unitRate: true,
                clientPOItems: {
                  include: {
                    clientPurchaseOrder: {
                      select: { id: true, cpoNo: true, status: true },
                    },
                  },
                },
              },
            },
            rateRevisions: {
              include: {
                changedBy: { select: { name: true } },
              },
              orderBy: { changedAt: "desc" as const },
            },
          },
          orderBy: { sNo: "asc" as const },
        },
      },
    });

    if (!clientPO) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    // Enrich items with balance information
    const enrichedItems = clientPO.items.map((item) => {
      const qtyQuoted = Number(item.quotationItem.quantity);
      const totalOrderedAllCPOs = item.quotationItem.clientPOItems
        .filter((cpoItem) => cpoItem.clientPurchaseOrder.status !== "CANCELLED")
        .reduce((sum, cpoItem) => sum + Number(cpoItem.qtyOrdered), 0);
      const balanceQty = Math.max(0, qtyQuoted - totalOrderedAllCPOs);

      return {
        ...item,
        od: item.od ? Number(item.od) : null,
        wt: item.wt ? Number(item.wt) : null,
        qtyQuoted,
        qtyOrdered: Number(item.qtyOrdered),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
        quotedRate: item.quotationItem.unitRate ? Number(item.quotationItem.unitRate) : Number(item.unitRate),
        totalOrderedAllCPOs,
        balanceQty,
        otherOrders: item.quotationItem.clientPOItems
          .filter(
            (cpoItem) =>
              cpoItem.clientPurchaseOrder.id !== clientPO.id &&
              cpoItem.clientPurchaseOrder.status !== "CANCELLED"
          )
          .map((cpoItem) => ({
            cpoNo: cpoItem.clientPurchaseOrder.cpoNo,
            qtyOrdered: Number(cpoItem.qtyOrdered),
          })),
        rateRevisions: item.rateRevisions.map((rev: any) => ({
          id: rev.id,
          oldRate: Number(rev.oldRate),
          newRate: Number(rev.newRate),
          remark: rev.remark,
          overallRemark: rev.overallRemark,
          changedBy: rev.changedBy.name,
          changedAt: rev.changedAt,
        })),
      };
    });

    const toNum = (v: any) => (v !== null && v !== undefined ? Number(v) : null);

    return NextResponse.json({
      ...clientPO,
      subtotal: toNum(clientPO.subtotal),
      // Additional charges
      freight: toNum(clientPO.freight),
      tpiCharges: toNum(clientPO.tpiCharges),
      testingCharges: toNum(clientPO.testingCharges),
      packingForwarding: toNum(clientPO.packingForwarding),
      insurance: toNum(clientPO.insurance),
      otherCharges: toNum(clientPO.otherCharges),
      // GST
      additionalChargesTotal: toNum(clientPO.additionalChargesTotal),
      taxableAmount: toNum(clientPO.taxableAmount),
      gstRate: toNum(clientPO.gstRate),
      cgst: toNum(clientPO.cgst),
      sgst: toNum(clientPO.sgst),
      igst: toNum(clientPO.igst),
      roundOff: toNum(clientPO.roundOff),
      grandTotal: toNum(clientPO.grandTotal),
      items: enrichedItems,
    });
  } catch (error) {
    console.error("Error fetching client purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch client purchase order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("clientPO", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { items, bulkOverallRemark, committedDeliveryDate, isDomesticDelivery, shipmentAddress } = body;

    const existingCPO = await prisma.clientPurchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingCPO) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    if (existingCPO.status === "CANCELLED" || existingCPO.status === "FULLY_FULFILLED") {
      return NextResponse.json({ error: "Cannot modify a cancelled or fulfilled order" }, { status: 400 });
    }

    // Update delivery-side CPO-level fields (currency/exchangeRate are frozen at create)
    const cpoTopLevelUpdate: Record<string, unknown> = {};
    if (committedDeliveryDate !== undefined) {
      cpoTopLevelUpdate.committedDeliveryDate = committedDeliveryDate ? new Date(committedDeliveryDate) : null;
    }
    if (isDomesticDelivery !== undefined) {
      cpoTopLevelUpdate.isDomesticDelivery = Boolean(isDomesticDelivery);
    }
    if (shipmentAddress !== undefined) {
      cpoTopLevelUpdate.shipmentAddress = shipmentAddress ?? null;
    }
    if (Object.keys(cpoTopLevelUpdate).length > 0) {
      await prisma.clientPurchaseOrder.update({ where: { id }, data: cpoTopLevelUpdate });
    }

    if (items && Array.isArray(items)) {
      const rateRevisions = [];

      for (const itemUpdate of items) {
        const existingItem = existingCPO.items.find((i) => i.id === itemUpdate.id);
        if (!existingItem) continue;

        const oldRate = Number(existingItem.unitRate);
        const newRate = parseFloat(itemUpdate.unitRate);
        const rateChanged = !isNaN(newRate) && newRate > 0 && oldRate !== newRate;

        const itemData: Record<string, unknown> = {
          ...(itemUpdate.poSlNo !== undefined && { poSlNo: itemUpdate.poSlNo ?? null }),
          ...(itemUpdate.poItemCode !== undefined && { poItemCode: itemUpdate.poItemCode ?? null }),
          ...(itemUpdate.rateRemark !== undefined && { rateRemark: itemUpdate.rateRemark ?? null }),
        };

        if (rateChanged) {
          const newAmount = Number(existingItem.qtyOrdered) * newRate;
          itemData.unitRate = newRate;
          itemData.amount = newAmount;
        }

        if (Object.keys(itemData).length > 0) {
          await prisma.clientPOItem.update({ where: { id: itemUpdate.id }, data: itemData });
        }

        if (rateChanged) {
          rateRevisions.push({
            clientPOItemId: itemUpdate.id,
            oldRate: oldRate,
            newRate: newRate,
            remark: itemUpdate.rateRemark || "Rate updated",
            overallRemark: bulkOverallRemark || null,
            changedById: session.user.id,
            companyId: companyId!,
          });
        }
      }

      if (rateRevisions.length > 0) {
        await prisma.rateRevision.createMany({ data: rateRevisions });
      }

      // Recalculate subtotal and grand total
      const updatedItems = await prisma.clientPOItem.findMany({
        where: { clientPurchaseOrderId: id },
      });
      const newSubtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount), 0);

      const additionalChargesTotal = Number(existingCPO.additionalChargesTotal || 0);
      const taxableAmount = newSubtotal + additionalChargesTotal;
      const gstRate = Number(existingCPO.gstRate || 18);
      const isInterState = existingCPO.isInterState;

      let cgst = 0, sgst = 0, igst = 0;
      if (isInterState) {
        igst = (taxableAmount * gstRate) / 100;
      } else {
        cgst = (taxableAmount * gstRate) / 200;
        sgst = (taxableAmount * gstRate) / 200;
      }

      const grandTotalRaw = taxableAmount + cgst + sgst + igst;
      const roundOff = Math.round(grandTotalRaw) - grandTotalRaw;

      await prisma.clientPurchaseOrder.update({
        where: { id },
        data: { subtotal: newSubtotal, taxableAmount, cgst, sgst, igst, roundOff, grandTotal: Math.round(grandTotalRaw) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client purchase order:", error);
    return NextResponse.json({ error: "Failed to update client purchase order" }, { status: 500 });
  }
}
