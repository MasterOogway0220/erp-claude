import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    // ---- Sales Metrics ----
    const [
      revenueAgg,
      orderCount,
      enquiryCount,
      quotationCount,
      totalQuotations,
      wonQuotations,
      poCount,
      openSOValueAgg,
      openPOValueAgg,
      openSOCount,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.salesOrder.count(),
      prisma.enquiry.count({ where: { status: "OPEN" } }),
      prisma.quotation.count({ where: { status: { in: ["DRAFT", "SENT", "APPROVED", "PENDING_APPROVAL"] } } }),
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: "WON" } }),
      prisma.purchaseOrder.count({ where: { status: { in: ["OPEN", "SENT_TO_VENDOR", "PARTIALLY_RECEIVED"] } } }),
      prisma.salesOrderItem.aggregate({
        where: { salesOrder: { status: { in: ["OPEN", "PARTIALLY_DISPATCHED"] } } },
        _sum: { amount: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: { status: { in: ["OPEN", "SENT_TO_VENDOR", "PARTIALLY_RECEIVED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.salesOrder.count({ where: { status: { in: ["OPEN", "PARTIALLY_DISPATCHED"] } } }),
    ]);

    const revenue = revenueAgg._sum.totalAmount ?? 0;
    const openSOValue = Number(openSOValueAgg._sum.amount ?? 0);
    const openPOValue = Number(openPOValueAgg._sum.totalAmount ?? 0);
    const conversionRate =
      totalQuotations > 0
        ? Number(((wonQuotations / totalQuotations) * 100).toFixed(2))
        : 0;

    // ---- Inventory Metrics ----
    const [totalStock, underInspection, accepted, inventoryQtyAgg] = await Promise.all([
      prisma.inventoryStock.count(),
      prisma.inventoryStock.count({ where: { status: "UNDER_INSPECTION" } }),
      prisma.inventoryStock.count({ where: { status: "ACCEPTED" } }),
      prisma.inventoryStock.aggregate({
        where: { status: "ACCEPTED" },
        _sum: { quantityMtr: true },
      }),
    ]);

    const acceptedTotalMtr = Number(inventoryQtyAgg._sum.quantityMtr ?? 0);

    // Calculate inventory value by tracing stock -> GRN Item -> GRN -> PO -> PO Items
    // Match each stock item to its corresponding PO item by product + sizeLabel to get unitRate
    const acceptedStockWithPO = await prisma.inventoryStock.findMany({
      where: { status: { in: ["ACCEPTED", "RESERVED"] } },
      select: {
        id: true,
        quantityMtr: true,
        product: true,
        sizeLabel: true,
        grnItem: {
          select: {
            product: true,
            sizeLabel: true,
            grn: {
              select: {
                purchaseOrder: {
                  select: {
                    items: {
                      select: {
                        product: true,
                        sizeLabel: true,
                        unitRate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let inventoryValue = 0;
    for (const stock of acceptedStockWithPO) {
      const qty = Number(stock.quantityMtr);
      if (!stock.grnItem?.grn?.purchaseOrder?.items) continue;

      const poItems = stock.grnItem.grn.purchaseOrder.items;
      // Try to find matching PO item by product + sizeLabel
      const matchingItem = poItems.find(
        (pi) =>
          pi.product === (stock.grnItem?.product || stock.product) &&
          pi.sizeLabel === (stock.grnItem?.sizeLabel || stock.sizeLabel)
      );

      if (matchingItem) {
        inventoryValue += qty * Number(matchingItem.unitRate);
      } else if (poItems.length === 1) {
        // If only one PO item, use its rate as fallback
        inventoryValue += qty * Number(poItems[0].unitRate);
      }
      // If no match and multiple PO items, skip (cannot determine rate)
    }

    // ---- Quality Metrics ----
    const [totalNCRs, openNCRs, totalInspections, passedInspections] =
      await Promise.all([
        prisma.nCR.count(),
        prisma.nCR.count({ where: { status: "OPEN" } }),
        prisma.inspection.count(),
        prisma.inspection.count({ where: { overallResult: "PASS" } }),
      ]);

    const inspectionPassRate =
      totalInspections > 0
        ? Number(((passedInspections / totalInspections) * 100).toFixed(1))
        : 0;

    // ---- Dispatch Metrics ----
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayDispatches = await prisma.dispatchNote.count({
      where: { dispatchDate: { gte: todayStart, lte: todayEnd } },
    });

    const dispatchNotes = await prisma.dispatchNote.findMany({
      select: {
        dispatchDate: true,
        salesOrder: {
          select: {
            items: {
              select: { deliveryDate: true },
            },
          },
        },
      },
    });

    const totalDispatches = dispatchNotes.length;
    let onTimeDispatches = 0;

    for (const dn of dispatchNotes) {
      const deliveryDates = dn.salesOrder.items
        .map((item) => item.deliveryDate)
        .filter((d): d is Date => d !== null);

      if (deliveryDates.length === 0) {
        onTimeDispatches++;
        continue;
      }

      const earliestDelivery = new Date(
        Math.min(...deliveryDates.map((d) => d.getTime()))
      );

      if (dn.dispatchDate <= earliestDelivery) {
        onTimeDispatches++;
      }
    }

    const onTimeDeliveryPct =
      totalDispatches > 0
        ? Number(((onTimeDispatches / totalDispatches) * 100).toFixed(1))
        : 0;

    // ---- Low Stock Alerts ----
    // Group accepted stock by product+sizeLabel, find ones with low quantity
    const stockByProduct = await prisma.inventoryStock.groupBy({
      by: ["product", "sizeLabel"],
      where: { status: "ACCEPTED" },
      _sum: { quantityMtr: true },
      _count: { id: true },
    });

    // Products with accepted stock below 50 Mtr are considered low stock
    const LOW_STOCK_THRESHOLD = 50;
    const lowStockAlerts = stockByProduct
      .filter((g) => Number(g._sum.quantityMtr) < LOW_STOCK_THRESHOLD && g.product)
      .map((g) => ({
        product: g.product,
        sizeLabel: g.sizeLabel,
        availableQty: Number(g._sum.quantityMtr),
        pieces: g._count.id,
      }))
      .sort((a, b) => a.availableQty - b.availableQty)
      .slice(0, 10);

    // ---- Finance Metrics ----
    const [, paymentTotals] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { in: ["SENT", "PARTIALLY_PAID"] } },
        _sum: { totalAmount: true },
      }),
      prisma.paymentReceipt.aggregate({
        _sum: { amountReceived: true },
      }),
    ]);

    // Calculate actual outstanding by subtracting payments from unpaid invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID"] } },
      select: {
        totalAmount: true,
        paymentReceipts: {
          select: { amountReceived: true },
        },
      },
    });

    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
      const paid = inv.paymentReceipts.reduce(
        (s, pr) => s + Number(pr.amountReceived),
        0
      );
      return sum + (Number(inv.totalAmount) - paid);
    }, 0);

    const totalReceived = Number(paymentTotals._sum.amountReceived ?? 0);

    return NextResponse.json({
      salesMetrics: {
        revenue,
        orderCount,
        openSOCount,
        enquiryCount,
        quotationCount,
        openSOValue,
        poCount,
        openPOValue: Number(openPOValue.toFixed(2)),
        conversionRate,
      },
      inventoryMetrics: {
        totalStock,
        underInspection,
        accepted,
        acceptedTotalMtr,
        inventoryValue: Number(inventoryValue.toFixed(2)),
      },
      qualityMetrics: {
        totalNCRs,
        openNCRs,
        inspectionPassRate,
      },
      dispatchMetrics: {
        totalDispatches,
        onTimeDeliveryPct,
        todayDispatches,
      },
      financialMetrics: {
        outstandingReceivables: Number(totalOutstanding.toFixed(2)),
        totalReceived,
      },
      lowStockAlerts,
    });
  } catch (error) {
    console.error("Error fetching management review:", error);
    return NextResponse.json(
      { error: "Failed to fetch management review data" },
      { status: 500 }
    );
  }
}
