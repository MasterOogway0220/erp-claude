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

    // Total revenue from paid invoices
    const paidInvoices = await prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { totalAmount: true },
    });
    const totalRevenue = paidInvoices._sum.totalAmount ?? 0;

    // Count totals
    const [totalEnquiries, totalQuotations, totalSalesOrders, wonQuotations] =
      await Promise.all([
        prisma.enquiry.count(),
        prisma.quotation.count(),
        prisma.salesOrder.count(),
        prisma.quotation.count({ where: { status: "WON" } }),
      ]);

    const conversionRate =
      totalQuotations > 0
        ? Number(((wonQuotations / totalQuotations) * 100).toFixed(2))
        : 0;

    // Monthly trend - last 12 months of invoice amounts grouped by month
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const invoicesForTrend = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        invoiceDate: { gte: twelveMonthsAgo },
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
      },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }

    for (const inv of invoicesForTrend) {
      const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(inv.totalAmount));
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Recent 10 sales orders with customer
    const recentOrders = await prisma.salesOrder.findMany({
      take: 10,
      orderBy: { soDate: "desc" },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      totalRevenue,
      totalEnquiries,
      totalQuotations,
      totalSalesOrders,
      conversionRate,
      monthlyTrend,
      recentOrders,
    });
  } catch (error) {
    console.error("Error fetching sales dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales dashboard data" },
      { status: 500 }
    );
  }
}
