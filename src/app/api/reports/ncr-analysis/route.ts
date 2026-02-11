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

    // Total NCRs and breakdown by status
    const [totalNCRs, openNCRs, closedNCRs] = await Promise.all([
      prisma.nCR.count(),
      prisma.nCR.count({ where: { status: "OPEN" } }),
      prisma.nCR.count({ where: { status: "CLOSED" } }),
    ]);

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
