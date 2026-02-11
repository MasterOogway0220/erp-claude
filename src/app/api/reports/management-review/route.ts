import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Sales Metrics ----
    const [
      revenueAgg,
      orderCount,
      totalQuotations,
      wonQuotations,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.salesOrder.count(),
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: "WON" } }),
    ]);

    const revenue = revenueAgg._sum.totalAmount ?? 0;
    const conversionRate =
      totalQuotations > 0
        ? Number(((wonQuotations / totalQuotations) * 100).toFixed(2))
        : 0;

    // ---- Inventory Metrics ----
    const [totalStock, underInspection, accepted] = await Promise.all([
      prisma.inventoryStock.count(),
      prisma.inventoryStock.count({ where: { status: "UNDER_INSPECTION" } }),
      prisma.inventoryStock.count({ where: { status: "ACCEPTED" } }),
    ]);

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
    const [invoiceTotals, paymentTotals] = await Promise.all([
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
        conversionRate,
      },
      inventoryMetrics: {
        totalStock,
        underInspection,
        accepted,
      },
      qualityMetrics: {
        totalNCRs,
        openNCRs,
        inspectionPassRate,
      },
      dispatchMetrics: {
        totalDispatches,
        onTimeDeliveryPct,
      },
      financeMetrics: {
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
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
