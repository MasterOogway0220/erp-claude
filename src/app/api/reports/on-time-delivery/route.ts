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

    // Fetch all dispatch notes with their sales order item delivery dates
    const dispatchNotes = await prisma.dispatchNote.findMany({
      select: {
        id: true,
        dnNo: true,
        dispatchDate: true,
        destination: true,
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            customer: {
              select: { id: true, name: true },
            },
            items: {
              select: {
                deliveryDate: true,
              },
            },
          },
        },
      },
      orderBy: { dispatchDate: "desc" },
    });

    const totalDeliveries = dispatchNotes.length;

    let onTimeCount = 0;
    let totalDelayDays = 0;
    let lateCount = 0;
    const lateDeliveries: Array<{
      id: string;
      dnNo: string;
      dispatchDate: Date;
      destination: string | null;
      customerName: string;
      soNo: string;
      expectedDate: Date;
      delayDays: number;
    }> = [];

    for (const dn of dispatchNotes) {
      // Use the earliest delivery date from SO items as the expected date
      const deliveryDates = dn.salesOrder.items
        .map((item) => item.deliveryDate)
        .filter((d): d is Date => d !== null);

      if (deliveryDates.length === 0) {
        // No delivery date set - consider as on time
        onTimeCount++;
        continue;
      }

      const earliestDelivery = new Date(
        Math.min(...deliveryDates.map((d) => d.getTime()))
      );

      if (dn.dispatchDate <= earliestDelivery) {
        onTimeCount++;
      } else {
        const delayMs =
          dn.dispatchDate.getTime() - earliestDelivery.getTime();
        const delayDays = Number(
          (delayMs / (1000 * 60 * 60 * 24)).toFixed(1)
        );
        totalDelayDays += delayDays;
        lateCount++;

        lateDeliveries.push({
          id: dn.id,
          dnNo: dn.dnNo,
          dispatchDate: dn.dispatchDate,
          destination: dn.destination,
          customerName: dn.salesOrder.customer.name,
          soNo: dn.salesOrder.soNo,
          expectedDate: earliestDelivery,
          delayDays,
        });
      }
    }

    const onTimePct =
      totalDeliveries > 0
        ? Number(((onTimeCount / totalDeliveries) * 100).toFixed(1))
        : 0;

    const avgDelayDays =
      lateCount > 0 ? Number((totalDelayDays / lateCount).toFixed(1)) : 0;

    // Monthly trend - last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyMap = new Map<
      string,
      { total: number; onTime: number }
    >();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { total: 0, onTime: 0 });
    }

    for (const dn of dispatchNotes) {
      if (dn.dispatchDate < twelveMonthsAgo) continue;

      const key = `${dn.dispatchDate.getFullYear()}-${String(dn.dispatchDate.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (!entry) continue;

      entry.total++;

      const deliveryDates = dn.salesOrder.items
        .map((item) => item.deliveryDate)
        .filter((d): d is Date => d !== null);

      if (deliveryDates.length === 0) {
        entry.onTime++;
      } else {
        const earliestDelivery = new Date(
          Math.min(...deliveryDates.map((d) => d.getTime()))
        );
        if (dn.dispatchDate <= earliestDelivery) {
          entry.onTime++;
        }
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        totalDeliveries: data.total,
        onTimeDeliveries: data.onTime,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Limit late deliveries to 20, sorted by most recent
    const recentLateDeliveries = lateDeliveries.slice(0, 20);

    return NextResponse.json({
      totalDeliveries,
      onTimeCount,
      onTimePct,
      avgDelayDays,
      monthlyTrend,
      lateDeliveries: recentLateDeliveries,
    });
  } catch (error) {
    console.error("Error fetching on-time delivery report:", error);
    return NextResponse.json(
      { error: "Failed to fetch on-time delivery data" },
      { status: 500 }
    );
  }
}
