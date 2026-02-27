import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("inventory", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as StockStatus | null;
    const product = searchParams.get("product") || "";
    const sizeLabel = searchParams.get("sizeLabel") || "";
    const heatNo = searchParams.get("heatNo") || "";
    const location = searchParams.get("location") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const where: any = {};

    if (search) {
      where.OR = [
        { heatNo: { contains: search as const } },
        { product: { contains: search as const } },
        { sizeLabel: { contains: search as const } },
        { specification: { contains: search as const } },
        { location: { contains: search as const } },
      ];
    }

    if (status) where.status = status;
    if (product) where.product = { contains: product as const };
    if (sizeLabel) where.sizeLabel = { contains: sizeLabel as const };
    if (heatNo) where.heatNo = { contains: heatNo as const };
    if (location) where.location = { contains: location as const };

    const [stocks, total] = await Promise.all([
      prisma.inventoryStock.findMany({
        where,
        include: {
          grnItem: {
            select: {
              id: true,
              grn: {
                select: { id: true, grnNo: true, grnDate: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inventoryStock.count({ where }),
    ]);

    // Get summary counts
    const statusCounts = await prisma.inventoryStock.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const summary = {
      total,
      byStatus: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.id])
      ),
    };

    return NextResponse.json({
      stocks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary,
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock" },
      { status: 500 }
    );
  }
}
