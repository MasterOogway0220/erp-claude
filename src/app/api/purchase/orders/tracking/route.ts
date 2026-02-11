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

    // Fetch all active purchase orders with delivery tracking
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: {
          notIn: ["CANCELLED"],
        },
        deliveryDate: {
          not: null,
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        goodsReceiptNotes: {
          select: {
            id: true,
            grnNo: true,
            grnDate: true,
          },
          orderBy: {
            grnDate: "asc",
          },
          take: 1, // Get first GRN for actual delivery date
        },
      },
      orderBy: {
        deliveryDate: "asc",
      },
    });

    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    console.error("Error fetching PO tracking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
