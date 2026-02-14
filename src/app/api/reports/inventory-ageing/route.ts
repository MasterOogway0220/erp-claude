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

    const now = new Date();

    // Fetch all stock items with their createdAt dates
    const stockItems = await prisma.inventoryStock.findMany({
      select: {
        id: true,
        product: true,
        sizeLabel: true,
        heatNo: true,
        quantityMtr: true,
        pieces: true,
        status: true,
        createdAt: true,
        location: true,
      },
    });

    // Calculate ageing buckets
    const buckets: Record<string, number> = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-180": 0,
      "181-365": 0,
      "365+": 0,
    };

    const slowMovingItems: typeof stockItems = [];

    for (const item of stockItems) {
      const ageDays = Math.floor(
        (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageDays <= 30) {
        buckets["0-30"]++;
      } else if (ageDays <= 60) {
        buckets["31-60"]++;
      } else if (ageDays <= 90) {
        buckets["61-90"]++;
      } else if (ageDays <= 180) {
        buckets["91-180"]++;
      } else if (ageDays <= 365) {
        buckets["181-365"]++;
      } else {
        buckets["365+"]++;
      }

      // Collect slow-moving items: ACCEPTED status and age > 180 days
      if (item.status === "ACCEPTED" && ageDays > 180) {
        slowMovingItems.push(item);
      }
    }

    // Sort slow-moving by oldest first, limit to 20
    const sortedSlowMoving = slowMovingItems
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 20)
      .map((item) => ({
        ...item,
        ageDays: Math.floor(
          (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    return NextResponse.json({
      buckets,
      slowMovingItems: sortedSlowMoving,
    });
  } catch (error) {
    console.error("Error fetching inventory ageing:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory ageing data" },
      { status: 500 }
    );
  }
}
