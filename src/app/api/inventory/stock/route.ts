import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("inventory", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as StockStatus | null;
    const product = searchParams.get("product") || "";
    const sizeLabel = searchParams.get("sizeLabel") || "";
    const heatNo = searchParams.get("heatNo") || "";
    const location = searchParams.get("location") || "";
    const warehouseId = searchParams.get("warehouseId") || "";
    const rack = searchParams.get("rack") || "";
    const bay = searchParams.get("bay") || "";
    const vendorId = searchParams.get("vendorId") || "";
    const selfStock = searchParams.get("selfStock"); // "true" | "false" | null
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { heatNo: { contains: search } },
        { product: { contains: search } },
        { sizeLabel: { contains: search } },
        { specification: { contains: search } },
        { location: { contains: search } },
      ];
    }

    if (status) where.status = status;
    if (product) where.product = { contains: product };
    if (sizeLabel) where.sizeLabel = { contains: sizeLabel };
    if (heatNo) where.heatNo = { contains: heatNo };
    if (location) where.location = { contains: location };

    // Warehouse location filters (Warehouse → Rack → Rack Number/Bay)
    if (warehouseId || rack || bay || selfStock !== null) {
      const locWhere: any = {};
      if (warehouseId) {
        locWhere.warehouseId = warehouseId;
      }
      if (rack) {
        locWhere.rack = rack;
      }
      if (bay) {
        locWhere.bay = bay;
      }
      if (selfStock !== null) {
        locWhere.warehouse = { isSelfStock: selfStock === "true" };
      }
      where.warehouseLocation = locWhere;
    }

    // Vendor filter (through GRNItem → GRN → vendorId)
    if (vendorId) {
      where.grnItem = {
        grn: { vendorId },
      };
    }

    const [stocks, total] = await Promise.all([
      prisma.inventoryStock.findMany({
        where,
        include: {
          grnItem: {
            select: {
              id: true,
              grn: {
                select: {
                  id: true,
                  grnNo: true,
                  grnDate: true,
                  vendorId: true,
                  vendor: { select: { id: true, name: true } },
                },
              },
            },
          },
          warehouseLocation: {
            select: {
              id: true,
              zone: true,
              rack: true,
              bay: true,
              shelf: true,
              warehouse: {
                select: { id: true, code: true, name: true, isSelfStock: true },
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
