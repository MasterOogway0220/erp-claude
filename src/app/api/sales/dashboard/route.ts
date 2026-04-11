import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function endOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}

function startOfQuarter(date: Date): Date {
  const month = date.getMonth();
  const quarterStart = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), quarterStart, 1);
}

function startOfWeek(date: Date): Date {
  // Monday as start of week
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const cFilter = companyFilter(companyId);
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfLastMonth(now);
    const lastMonthEnd = endOfLastMonth(now);
    const thisQuarterStart = startOfQuarter(now);
    const lastQuarterStart = new Date(thisQuarterStart);
    lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);
    const lastQuarterEnd = new Date(thisQuarterStart);
    lastQuarterEnd.setMilliseconds(-1);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Run all independent queries in parallel
    const [
      // 1. Total CPOs (non-cancelled)
      totalCPOs,
      // 2. CPOs this month
      cposThisMonth,
      // 3. CPOs last month
      cposLastMonth,
      // 4. Pending acceptance CPOs (REGISTERED + no POAcceptance)
      pendingAcceptanceCPOs,
      // 5. Order value this month
      orderValueThisMonthResult,
      // 6. Order value last month
      orderValueLastMonthResult,
      // 7. Overdue CPOs
      overdueCPOs,
      // 8. Pending processing (accepted with ISSUED status but CPO still REGISTERED)
      pendingProcessingCount,
      // 9. Stock allotment - sales order items on OPEN SOs
      openSOItems,
      // 10. Quotations this quarter
      quotationsThisQuarter,
      // 11. CPOs this quarter
      cposThisQuarter,
      // 12a. Quotations last quarter
      quotationsLastQuarter,
      // 12b. CPOs last quarter
      cposLastQuarter,
      // 13. Rate revisions this month
      rateRevisionsThisMonth,
      // 13. CPOs created this month for top customers
      cposThisMonthFull,
      // 14. Deliveries due this week + overdue
      deliveriesDueThisWeek,
      // 15. Recent CPOs
      recentCPOs,
    ] = await Promise.all([
      // 1. Total CPOs (non-cancelled)
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
        },
      }),

      // 2. CPOs this month count
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: thisMonthStart },
        },
      }),

      // 3. CPOs last month count
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),

      // 4. Pending acceptance CPOs with their cpoDate for aging
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          status: "REGISTERED",
          poAcceptance: { is: null },
        },
        select: { id: true, cpoDate: true },
      }),

      // 5. Order value this month (sum of grandTotal)
      prisma.clientPurchaseOrder.aggregate({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: thisMonthStart },
        },
        _sum: { grandTotal: true },
      }),

      // 6. Order value last month
      prisma.clientPurchaseOrder.aggregate({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { grandTotal: true },
      }),

      // 7. Overdue CPOs with deliveryDate
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          deliveryDate: { lt: now },
          status: { in: ["REGISTERED", "PARTIALLY_FULFILLED"] },
        },
        select: { id: true, deliveryDate: true },
      }),

      // 8. Pending processing: CPO REGISTERED but has a POAcceptance with status ISSUED
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: "REGISTERED",
          poAcceptance: {
            status: "ISSUED",
          },
        },
      }),

      // 9. Open SO items with their reservations
      prisma.salesOrderItem.findMany({
        where: {
          salesOrder: {
            ...cFilter,
            status: "OPEN",
          },
        },
        select: {
          id: true,
          quantity: true,
          stockReservations: {
            where: { status: { in: ["RESERVED", "DISPATCHED"] } },
            select: { reservedQtyMtr: true, status: true },
          },
        },
      }),

      // 10. Quotations this quarter (SENT, APPROVED, WON)
      prisma.quotation.count({
        where: {
          ...cFilter,
          status: { in: ["SENT", "APPROVED", "WON"] },
          quotationDate: { gte: thisQuarterStart },
        },
      }),

      // 11. CPOs this quarter (non-cancelled)
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: thisQuarterStart },
        },
      }),

      // 12a. Quotations last quarter
      prisma.quotation.count({
        where: {
          ...cFilter,
          status: { in: ["SENT", "APPROVED", "WON"] },
          quotationDate: { gte: lastQuarterStart, lte: lastQuarterEnd },
        },
      }),

      // 12b. CPOs last quarter
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: lastQuarterStart, lte: lastQuarterEnd },
        },
      }),

      // 13. Rate revisions this month with oldRate, newRate, clientPOItem qtyOrdered
      prisma.rateRevision.findMany({
        where: {
          ...cFilter,
          changedAt: { gte: thisMonthStart },
        },
        select: {
          oldRate: true,
          newRate: true,
          clientPOItem: { select: { qtyOrdered: true, amount: true, unitRate: true } },
        },
      }),

      // 13. CPOs this month for top customers
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: thisMonthStart },
        },
        select: {
          customerId: true,
          grandTotal: true,
          customer: { select: { name: true } },
        },
      }),

      // 14. Deliveries due this week + overdue
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          OR: [
            // Due this week
            {
              deliveryDate: { gte: weekStart, lte: weekEnd },
              status: { in: ["REGISTERED", "PARTIALLY_FULFILLED"] },
            },
            // Overdue
            {
              deliveryDate: { lt: now },
              status: { in: ["REGISTERED", "PARTIALLY_FULFILLED"] },
            },
          ],
        },
        select: {
          id: true,
          cpoNo: true,
          deliveryDate: true,
          status: true,
          customer: { select: { name: true } },
        },
        orderBy: { deliveryDate: "asc" },
        take: 10,
      }),

      // 15. Recent CPOs
      prisma.clientPurchaseOrder.findMany({
        where: { ...cFilter },
        select: {
          id: true,
          cpoNo: true,
          clientPoNumber: true,
          grandTotal: true,
          status: true,
          deliveryDate: true,
          customer: { select: { name: true } },
        },
        orderBy: { cpoDate: "desc" },
        take: 10,
      }),
    ]);

    // --- Compute derived KPIs ---

    // cpoChangePercent
    const cpoChangePercent =
      cposLastMonth === 0
        ? cposThisMonth > 0
          ? 100
          : 0
        : ((cposThisMonth - cposLastMonth) / cposLastMonth) * 100;

    // pendingAcceptance count
    const pendingAcceptance = pendingAcceptanceCPOs.length;

    // pendingAcceptanceAging
    const pendingAcceptanceAging = { lt3: 0, "3to7": 0, gt7: 0 };
    for (const cpo of pendingAcceptanceCPOs) {
      const diffMs = now.getTime() - new Date(cpo.cpoDate).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 3) {
        pendingAcceptanceAging.lt3++;
      } else if (diffDays <= 7) {
        pendingAcceptanceAging["3to7"]++;
      } else {
        pendingAcceptanceAging.gt7++;
      }
    }

    // orderValueMonth
    const orderValueMonth = Number(orderValueThisMonthResult._sum.grandTotal ?? 0);
    const orderValueLastMonth = Number(orderValueLastMonthResult._sum.grandTotal ?? 0);
    const orderValueChangePercent =
      orderValueLastMonth === 0
        ? orderValueMonth > 0
          ? 100
          : 0
        : ((orderValueMonth - orderValueLastMonth) / orderValueLastMonth) * 100;

    // overdueDeliveries & avgDaysOverdue
    const overdueDeliveries = overdueCPOs.length;
    let totalDaysOverdue = 0;
    for (const cpo of overdueCPOs) {
      if (cpo.deliveryDate) {
        const diffMs = now.getTime() - new Date(cpo.deliveryDate).getTime();
        totalDaysOverdue += diffMs / (1000 * 60 * 60 * 24);
      }
    }
    const avgDaysOverdue = overdueDeliveries > 0 ? totalDaysOverdue / overdueDeliveries : 0;

    // stockAllotment: for each SO item, check reservations
    let stockPartial = 0;
    let stockPending = 0;
    for (const item of openSOItems) {
      const activeReservations = item.stockReservations.filter(
        (r) => r.status === "RESERVED" || r.status === "DISPATCHED"
      );
      if (activeReservations.length === 0) {
        stockPending++;
      } else {
        // Check if fully reserved
        const totalReserved = activeReservations.reduce(
          (sum, r) => sum + Number(r.reservedQtyMtr),
          0
        );
        if (totalReserved < Number(item.quantity)) {
          stockPartial++;
        }
        // fully reserved items are not counted in pending or partial
      }
    }

    // quotationConversion
    const quotationConversion =
      quotationsThisQuarter === 0
        ? 0
        : (cposThisQuarter / quotationsThisQuarter) * 100;

    // quotationConversionChange
    const conversionLastQuarter =
      quotationsLastQuarter === 0
        ? 0
        : (cposLastQuarter / quotationsLastQuarter) * 100;
    const quotationConversionChange = Math.round((quotationConversion - conversionLastQuarter) * 10) / 10;

    // rateNegotiationImpact & avgDiscountPercent
    let rateNegotiationImpact = 0;
    let totalDiscountAmount = 0;
    let totalOriginalValue = 0;
    for (const rev of rateRevisionsThisMonth) {
      const oldRate = Number(rev.oldRate);
      const newRate = Number(rev.newRate);
      const qty = Number(rev.clientPOItem.qtyOrdered);
      const impact = (oldRate - newRate) * qty;
      rateNegotiationImpact += impact;
      if (oldRate > 0) {
        totalDiscountAmount += impact;
        totalOriginalValue += oldRate * qty;
      }
    }
    const avgDiscountPercent =
      totalOriginalValue === 0 ? 0 : (totalDiscountAmount / totalOriginalValue) * 100;

    // topCustomers: group by customerId, sum grandTotal, top 5
    const customerMap = new Map<string, { customerName: string; orderValue: number }>();
    for (const cpo of cposThisMonthFull) {
      const existing = customerMap.get(cpo.customerId);
      const val = Number(cpo.grandTotal ?? 0);
      if (existing) {
        existing.orderValue += val;
      } else {
        customerMap.set(cpo.customerId, {
          customerName: cpo.customer.name,
          orderValue: val,
        });
      }
    }
    const topCustomers = Array.from(customerMap.entries())
      .map(([customerId, data]) => ({ customerId, ...data }))
      .sort((a, b) => b.orderValue - a.orderValue)
      .slice(0, 5);

    // Shape deliveriesDueThisWeek
    const deliveriesDueThisWeekFormatted = deliveriesDueThisWeek.map((cpo) => ({
      id: cpo.id,
      cpoNo: cpo.cpoNo,
      customerName: cpo.customer.name,
      deliveryDate: cpo.deliveryDate ? cpo.deliveryDate.toISOString() : null,
      isOverdue: cpo.deliveryDate ? new Date(cpo.deliveryDate) < now : false,
    }));

    // Shape recentCPOs
    const recentCPOsFormatted = recentCPOs.map((cpo) => ({
      id: cpo.id,
      cpoNo: cpo.cpoNo,
      customerName: cpo.customer.name,
      clientPoNumber: cpo.clientPoNumber,
      grandTotal: Number(cpo.grandTotal ?? 0),
      status: cpo.status,
      deliveryDate: cpo.deliveryDate ? cpo.deliveryDate.toISOString() : null,
    }));

    return NextResponse.json({
      kpis: {
        totalCPOs,
        cpoChangePercent: Math.round(cpoChangePercent * 10) / 10,
        pendingAcceptance,
        pendingAcceptanceAging,
        orderValueMonth,
        orderValueChangePercent: Math.round(orderValueChangePercent * 10) / 10,
        overdueDeliveries,
        avgDaysOverdue: Math.round(avgDaysOverdue * 10) / 10,
        pendingProcessing: pendingProcessingCount,
        stockAllotment: { partial: stockPartial, pending: stockPending },
        quotationConversion: Math.round(quotationConversion * 10) / 10,
        quotationConversionChange,
        rateNegotiationImpact: Math.round(rateNegotiationImpact * 100) / 100,
        avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
      },
      deliveriesDueThisWeek: deliveriesDueThisWeekFormatted,
      topCustomers,
      recentCPOs: recentCPOsFormatted,
    });
  } catch (error) {
    console.error("Error fetching sales dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales dashboard data" },
      { status: 500 }
    );
  }
}
