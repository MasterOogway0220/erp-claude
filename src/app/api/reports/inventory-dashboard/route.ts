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

    // Total items
    const totalItems = await prisma.inventoryStock.count();

    // Group by status
    const statusGroups = await prisma.inventoryStock.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const byStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    // Group by product with count and sum of quantityMtr
    const productGroups = await prisma.inventoryStock.groupBy({
      by: ["product"],
      _count: { id: true },
      _sum: { quantityMtr: true },
    });

    const byProduct = productGroups.map((g) => ({
      product: g.product ?? "Unknown",
      count: g._count.id,
      totalQuantityMtr: g._sum.quantityMtr ?? 0,
    }));

    // Total quantity (meters) and total pieces
    const totals = await prisma.inventoryStock.aggregate({
      _sum: {
        quantityMtr: true,
        pieces: true,
      },
    });

    const totalQuantityMtr = totals._sum.quantityMtr ?? 0;
    const totalPieces = totals._sum.pieces ?? 0;

    return NextResponse.json({
      totalItems,
      byStatus,
      byProduct,
      totalQuantityMtr,
      totalPieces,
    });
  } catch (error) {
    console.error("Error fetching inventory dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory dashboard data" },
      { status: 500 }
    );
  }
}
