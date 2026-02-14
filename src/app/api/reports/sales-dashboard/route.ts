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

    const userRole = (session.user as any).role;
    if (!["MANAGEMENT", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse date range from query params
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const fromDate = fromParam ? new Date(fromParam) : undefined;
    const toDate = toParam ? new Date(toParam + "T23:59:59.999Z") : undefined;

    // Build date filter for invoices
    const invoiceDateFilter: any = { status: "PAID" };
    if (fromDate || toDate) {
      invoiceDateFilter.invoiceDate = {};
      if (fromDate) invoiceDateFilter.invoiceDate.gte = fromDate;
      if (toDate) invoiceDateFilter.invoiceDate.lte = toDate;
    }

    // Build date filter for sales orders
    const soDateFilter: any = {};
    if (fromDate || toDate) {
      soDateFilter.soDate = {};
      if (fromDate) soDateFilter.soDate.gte = fromDate;
      if (toDate) soDateFilter.soDate.lte = toDate;
    }

    // Build date filter for quotations
    const quotationDateFilter: any = {};
    if (fromDate || toDate) {
      quotationDateFilter.createdAt = {};
      if (fromDate) quotationDateFilter.createdAt.gte = fromDate;
      if (toDate) quotationDateFilter.createdAt.lte = toDate;
    }

    // Total revenue from paid invoices
    const paidInvoices = await prisma.invoice.aggregate({
      where: invoiceDateFilter,
      _sum: { totalAmount: true },
    });
    const totalRevenue = paidInvoices._sum.totalAmount ?? 0;

    // Count totals
    const [totalEnquiries, totalQuotations, totalSalesOrders, wonQuotations] =
      await Promise.all([
        prisma.enquiry.count({ where: fromDate || toDate ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : undefined }),
        prisma.quotation.count({ where: quotationDateFilter.createdAt ? { createdAt: quotationDateFilter.createdAt } : undefined }),
        prisma.salesOrder.count({ where: soDateFilter.soDate ? { soDate: soDateFilter.soDate } : undefined }),
        prisma.quotation.count({ where: { status: "WON", ...(quotationDateFilter.createdAt ? { createdAt: quotationDateFilter.createdAt } : {}) } }),
      ]);

    const conversionRate =
      totalQuotations > 0
        ? Number(((wonQuotations / totalQuotations) * 100).toFixed(2))
        : 0;

    // Monthly trend - use date range if provided, else last 12 months
    const trendStart = fromDate || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const invoicesForTrend = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        invoiceDate: { gte: trendStart, ...(toDate ? { lte: toDate } : {}) },
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
      },
    });

    const monthlyMap = new Map<string, number>();
    const endDate = toDate || new Date();
    const startDate = new Date(trendStart);
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= endDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
      cursor.setMonth(cursor.getMonth() + 1);
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

    // Recent 10 sales orders with customer (filtered by date range)
    const recentOrders = await prisma.salesOrder.findMany({
      where: soDateFilter.soDate ? { soDate: soDateFilter.soDate } : undefined,
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
