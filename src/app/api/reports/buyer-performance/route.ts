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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: any = {};
    if (customerId) {
      where.customerId = customerId;
    }
    if (dateFrom || dateTo) {
      where.quotationDate = {};
      if (dateFrom) where.quotationDate.gte = new Date(dateFrom);
      if (dateTo) where.quotationDate.lte = new Date(dateTo);
    }

    // Get all quotations with buyer info
    const quotations = await prisma.quotation.findMany({
      where,
      select: {
        id: true,
        status: true,
        buyer: { select: { id: true, buyerName: true } },
        customer: { select: { id: true, name: true } },
        items: { select: { amount: true } },
      },
    });

    // Group by customer + buyer
    const groupMap = new Map<string, {
      customerName: string;
      buyerName: string;
      totalQuotations: number;
      quotationsConverted: number;
      totalOrderValue: number;
    }>();

    for (const q of quotations) {
      const key = `${q.customer.id}_${q.buyer?.id || "no-buyer"}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          customerName: q.customer.name,
          buyerName: q.buyer?.buyerName || "(No Buyer)",
          totalQuotations: 0,
          quotationsConverted: 0,
          totalOrderValue: 0,
        });
      }

      const group = groupMap.get(key)!;
      group.totalQuotations += 1;

      if (q.status === "WON") {
        group.quotationsConverted += 1;
        group.totalOrderValue += q.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );
      }
    }

    const data = Array.from(groupMap.values()).map((g) => ({
      ...g,
      conversionRate:
        g.totalQuotations > 0
          ? ((g.quotationsConverted / g.totalQuotations) * 100).toFixed(1)
          : "0.0",
    }));

    // Sort by total order value descending
    data.sort((a, b) => b.totalOrderValue - a.totalOrderValue);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching buyer performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch buyer performance" },
      { status: 500 }
    );
  }
}
