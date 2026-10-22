import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { normalizeStockRow, stockKey, type StockRow } from "@/lib/inventory/stock-rows";
import { createStockRows, existingStockKeys } from "@/lib/inventory/stock-write";

const MAX_ITEMS_PER_REQUEST = 500;

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

// Add stock by hand. Body: { items: [ {...}, ... ] }; one item is a single add.
// All lines are validated before anything is written, so a bad line writes nothing.
export async function POST(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("inventory", "write");
    if (!authorized) return response!;
    if (!companyId) {
      return NextResponse.json({ error: "Select an active company before adding stock" }, { status: 400 });
    }

    const body = await request.json();
    const items: unknown[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
    }
    if (items.length > MAX_ITEMS_PER_REQUEST) {
      return NextResponse.json(
        { error: `At most ${MAX_ITEMS_PER_REQUEST} items per request` },
        { status: 400 }
      );
    }

    const rows: StockRow[] = [];
    const issues: { line: number; error: string }[] = [];
    items.forEach((item, i) => {
      const result = normalizeStockRow((item ?? {}) as Record<string, unknown>);
      if (result.ok) rows.push(result.row);
      else issues.push({ line: i + 1, error: result.error });
    });
    if (issues.length > 0) {
      return NextResponse.json({ error: "Some items are invalid", issues }, { status: 400 });
    }

    const existing = await existingStockKeys(companyId, rows.map((r) => r.heatNo));
    const seen = new Set<string>();
    const duplicates: { line: number; key: string }[] = [];
    rows.forEach((row, i) => {
      const key = stockKey(row);
      if (existing.has(key) || seen.has(key)) duplicates.push({ line: i + 1, key });
      seen.add(key);
    });
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: "These lines already exist in stock (same heat, MTC, size and rack)", duplicates },
        { status: 409 }
      );
    }

    const created = await createStockRows(companyId, rows);
    return NextResponse.json({ created }, { status: 201 });
  } catch (error) {
    console.error("Error adding stock:", error);
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}
