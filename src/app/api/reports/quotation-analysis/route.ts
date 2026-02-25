import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    // Total quotations
    const totalQuotations = await prisma.quotation.count();

    // Group by status
    const statusGroups = await prisma.quotation.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const byStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    // Conversion rate (WON / total)
    const wonCount =
      statusGroups.find((g) => g.status === "WON")?._count.id ?? 0;
    const conversionRate =
      totalQuotations > 0
        ? Number(((wonCount / totalQuotations) * 100).toFixed(2))
        : 0;

    const avgResponseTimeDays = 0;

    // Recent 10 quotations
    const recentQuotations = await prisma.quotation.findMany({
      take: 10,
      orderBy: { quotationDate: "desc" },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Lost reasons from quotations
    const lostQuotations = await prisma.quotation.findMany({
      where: { status: "LOST", lossReason: { not: null } },
      select: { lossReason: true },
    });
    const reasonCounts: Record<string, number> = {};
    for (const q of lostQuotations) {
      const reason = q.lossReason || "Unknown";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
    const lostReasonsSummary = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalQuotations,
      byStatus,
      avgResponseTimeDays,
      conversionRate,
      recentQuotations,
      lostReasonsSummary,
    });
  } catch (error) {
    console.error("Error fetching quotation analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation analysis data" },
      { status: 500 }
    );
  }
}
