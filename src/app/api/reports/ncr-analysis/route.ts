import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    // Total NCRs and breakdown by status
    const [totalNCRs, openNCRs, closedNCRs, caInProgressNCRs, verifiedNCRs, overdueNCRs] = await Promise.all([
      prisma.nCR.count(),
      prisma.nCR.count({ where: { status: "OPEN" } }),
      prisma.nCR.count({ where: { status: "CLOSED" } }),
      prisma.nCR.count({ where: { status: "CORRECTIVE_ACTION_IN_PROGRESS" } }),
      prisma.nCR.count({ where: { status: "VERIFIED" } }),
      prisma.nCR.count({
        where: {
          targetClosureDate: { lt: new Date() },
          status: { notIn: ["CLOSED", "VERIFIED"] },
        },
      }),
    ]);

    // Average closure days for closed NCRs
    const closedNCRsForAvg = await prisma.nCR.findMany({
      where: { status: { in: ["CLOSED", "VERIFIED"] }, closedDate: { not: null } },
      select: { ncrDate: true, closedDate: true },
    });

    let avgClosureDays = 0;
    if (closedNCRsForAvg.length > 0) {
      const totalDays = closedNCRsForAvg.reduce((sum, n) => {
        const days = Math.ceil(
          (new Date(n.closedDate!).getTime() - new Date(n.ncrDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgClosureDays = Math.round(totalDays / closedNCRsForAvg.length);
    }

    // By vendor (top vendors by NCR count)
    const vendorGroups = await prisma.nCR.groupBy({
      by: ["vendorId"],
      where: { vendorId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Fetch vendor names for the grouped results
    const vendorIds = vendorGroups
      .map((g) => g.vendorId)
      .filter((id): id is string => id !== null);

    const vendorNames = await prisma.vendorMaster.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true },
    });

    const vendorNameMap = new Map(vendorNames.map((v) => [v.id, v.name]));

    const byVendor = vendorGroups.map((g) => ({
      vendorId: g.vendorId,
      vendorName: g.vendorId ? vendorNameMap.get(g.vendorId) ?? "Unknown" : "Unknown",
      count: g._count.id,
    }));

    // By nonConformanceType
    const typeGroups = await prisma.nCR.groupBy({
      by: ["nonConformanceType"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const byType = typeGroups.map((g) => ({
      type: g.nonConformanceType ?? "Unspecified",
      count: g._count.id,
    }));

    // Monthly trend - last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const ncrsForTrend = await prisma.nCR.findMany({
      where: { ncrDate: { gte: twelveMonthsAgo } },
      select: { ncrDate: true },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }

    for (const ncr of ncrsForTrend) {
      const key = `${ncr.ncrDate.getFullYear()}-${String(ncr.ncrDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      totalNCRs,
      openNCRs,
      closedNCRs,
      caInProgressNCRs,
      verifiedNCRs,
      overdueNCRs,
      avgClosureDays,
      byVendor,
      byType,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Error fetching NCR analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch NCR analysis data" },
      { status: 500 }
    );
  }
}
