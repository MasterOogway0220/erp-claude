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
        items: {
          include: {
            quotationItem: {
              select: {
                id: true,
                quantity: true,
                clientPOItems: {
                  include: {
                    clientPurchaseOrder: {
                      select: { id: true, cpoNo: true, status: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sNo: "asc" },
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
        qtyQuoted: Number(item.qtyQuoted),
        qtyOrdered: Number(item.qtyOrdered),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
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
