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

    // Average response time: difference between quotation date and associated enquiry date
    const quotationsWithEnquiry = await prisma.quotation.findMany({
      where: { enquiryId: { not: null } },
      select: {
        quotationDate: true,
        enquiry: {
          select: { enquiryDate: true },
        },
      },
    });

    let avgResponseTimeDays = 0;
    if (quotationsWithEnquiry.length > 0) {
      const totalDays = quotationsWithEnquiry.reduce((sum, q) => {
        if (!q.enquiry) return sum;
        const diffMs =
          q.quotationDate.getTime() - q.enquiry.enquiryDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return sum + Math.max(0, diffDays);
      }, 0);
      avgResponseTimeDays = Number(
        (totalDays / quotationsWithEnquiry.length).toFixed(1)
      );
    }

    // Recent 10 quotations
    const recentQuotations = await prisma.quotation.findMany({
      take: 10,
      orderBy: { quotationDate: "desc" },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        enquiry: {
          select: { id: true, enquiryNo: true },
        },
      },
    });

    // Lost reasons from enquiries
    const lostReasons = await prisma.enquiry.findMany({
      where: { status: "LOST", lostReason: { not: null } },
      select: { lostReason: true },
    });
    const reasonCounts: Record<string, number> = {};
    for (const e of lostReasons) {
      const reason = e.lostReason || "Unknown";
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
