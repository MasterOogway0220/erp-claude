import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess(
      "purchaseOrder",
      "read"
    );
    if (!authorized) return response!;

    const filter = companyFilter(companyId);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ---------------------------------------------------------------------------
    // Summary counts
    // ---------------------------------------------------------------------------
    const [totalPR, totalPO, totalRFQ] = await Promise.all([
      prisma.purchaseRequisition.count({ where: { ...filter } }),
      prisma.purchaseOrder.count({ where: { ...filter } }),
      prisma.rFQ.count({ where: { ...filter } }),
    ]);

    const activeStatuses = ["DRAFT", "PENDING_APPROVAL", "OPEN", "SENT_TO_VENDOR", "PARTIALLY_RECEIVED"] as const;

    const activePOs = await prisma.purchaseOrder.count({
      where: {
        ...filter,
        status: { in: [...activeStatuses] },
      },
    });

    const overduePOs = await prisma.purchaseOrder.count({
      where: {
        ...filter,
        status: { in: [...activeStatuses] },
        deliveryDate: { lt: now, not: null },
      },
    });

    const dueThisWeek = await prisma.purchaseOrder.count({
      where: {
        ...filter,
        status: { in: [...activeStatuses] },
        deliveryDate: { gte: now, lte: sevenDaysFromNow },
      },
    });

    // ---------------------------------------------------------------------------
    // PO Status Breakdown
    // ---------------------------------------------------------------------------
    const poStatusRaw = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      where: { ...filter },
      _count: { id: true },
    });

    const poStatusBreakdown = poStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // ---------------------------------------------------------------------------
    // Vendor Performance
    // ---------------------------------------------------------------------------
    const vendorPOs = await prisma.purchaseOrder.findMany({
      where: { ...filter },
      select: {
        id: true,
        vendorId: true,
        status: true,
        totalAmount: true,
        deliveryDate: true,
        vendor: { select: { id: true, name: true, vendorRating: true } },
        goodsReceiptNotes: {
          select: { grnDate: true },
          orderBy: { grnDate: "asc" },
          take: 1,
        },
      },
    });

    // Count NCRs per vendor
    const ncrCounts = await prisma.nCR.groupBy({
      by: ["vendorId"],
      where: { ...filter, vendorId: { not: null } },
      _count: { id: true },
    });
    const ncrMap = new Map(
      ncrCounts.map((n) => [n.vendorId!, n._count.id])
    );

    // Aggregate per vendor
    const vendorMap = new Map<
      string,
      {
        vendorName: string;
        totalPOs: number;
        deliveredPOs: number;
        onTimeDeliveries: number;
        totalSpend: number;
        totalDelayDays: number;
        delayedCount: number;
        vendorRating: number | null;
        ncrCount: number;
      }
    >();

    for (const po of vendorPOs) {
      const vid = po.vendorId;
      if (!vendorMap.has(vid)) {
        vendorMap.set(vid, {
          vendorName: po.vendor.name,
          totalPOs: 0,
          deliveredPOs: 0,
          onTimeDeliveries: 0,
          totalSpend: 0,
          totalDelayDays: 0,
          delayedCount: 0,
          vendorRating: po.vendor.vendorRating
            ? Number(po.vendor.vendorRating)
            : null,
          ncrCount: ncrMap.get(vid) || 0,
        });
      }
      const v = vendorMap.get(vid)!;
      v.totalPOs++;

      const isDelivered =
        po.status === "FULLY_RECEIVED" || po.status === "CLOSED";

      if (isDelivered) {
        v.deliveredPOs++;
        v.totalSpend += Number(po.totalAmount || 0);

        if (po.deliveryDate && po.goodsReceiptNotes.length > 0) {
          const actualDate = po.goodsReceiptNotes[0].grnDate;
          const expected = po.deliveryDate;
          const diffDays = Math.ceil(
            (actualDate.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays <= 0) {
            v.onTimeDeliveries++;
          } else {
            v.totalDelayDays += diffDays;
            v.delayedCount++;
          }
        }
      }
    }

    const vendorPerformance = Array.from(vendorMap.entries()).map(
      ([vendorId, v]) => {
        const onTimePercent =
          v.deliveredPOs > 0
            ? Math.round((v.onTimeDeliveries / v.deliveredPOs) * 100)
            : 0;
        const avgDelayDays =
          v.delayedCount > 0
            ? Math.round(v.totalDelayDays / v.delayedCount)
            : 0;
        // Quality score: start at 10, deduct 0.5 per NCR, minimum 0
        const qualityScore =
          v.vendorRating !== null
            ? v.vendorRating
            : Math.max(0, 10 - v.ncrCount * 0.5);

        return {
          vendorId,
          vendorName: v.vendorName,
          totalPOs: v.totalPOs,
          deliveredPOs: v.deliveredPOs,
          onTimeDeliveries: v.onTimeDeliveries,
          onTimePercent,
          totalSpend: v.totalSpend,
          avgDelayDays,
          qualityScore: Math.round(qualityScore * 10) / 10,
        };
      }
    );

    // Sort by totalSpend descending
    vendorPerformance.sort((a, b) => b.totalSpend - a.totalSpend);

    // ---------------------------------------------------------------------------
    // Procurement Cycle Time (PR creation → PO creation)
    // ---------------------------------------------------------------------------
    const linkedPRs = await prisma.purchaseOrder.findMany({
      where: {
        ...filter,
        prId: { not: null },
      },
      select: {
        createdAt: true,
        purchaseRequisition: {
          select: { createdAt: true },
        },
      },
    });

    let totalCycleDays = 0;
    let totalCompleted = 0;
    for (const po of linkedPRs) {
      if (po.purchaseRequisition) {
        const diff =
          (po.createdAt.getTime() - po.purchaseRequisition.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        totalCycleDays += diff;
        totalCompleted++;
      }
    }

    const procurementCycleTime = {
      avgDays:
        totalCompleted > 0
          ? Math.round((totalCycleDays / totalCompleted) * 10) / 10
          : 0,
      totalCompleted,
    };

    // ---------------------------------------------------------------------------
    // Monthly Spend (last 6 months)
    // ---------------------------------------------------------------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentPOs = await prisma.purchaseOrder.findMany({
      where: {
        ...filter,
        poDate: { gte: sixMonthsAgo },
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      select: {
        poDate: true,
        totalAmount: true,
      },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }

    for (const po of recentPOs) {
      const key = `${po.poDate.getFullYear()}-${String(po.poDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(po.totalAmount || 0));
      }
    }

    const monthlySpend = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
      .reverse();

    // ---------------------------------------------------------------------------
    // Response
    // ---------------------------------------------------------------------------
    return NextResponse.json({
      summary: {
        totalPR,
        totalPO,
        totalRFQ,
        activePOs,
        overduePOs,
        dueThisWeek,
      },
      vendorPerformance,
      poStatusBreakdown,
      procurementCycleTime,
      monthlySpend,
    });
  } catch (error) {
    console.error("Error fetching purchase dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase dashboard data" },
      { status: 500 }
    );
  }
}
