import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const cFilter = companyFilter(companyId);

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          where: itemId ? { id: itemId } : undefined,
          orderBy: { sNo: "asc" },
          include: {
            stockReservations: {
              where: { status: "RESERVED" },
              select: { reservedQtyMtr: true },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    const analysisItems = await Promise.all(
      salesOrder.items.map(async (item) => {
        const orderedQty = Number(item.quantity);
        const existingReservations = item.stockReservations.reduce(
          (sum, r) => sum + Number(r.reservedQtyMtr), 0
        );
        const remainingQty = orderedQty - existingReservations;

        // Find matching available stock
        const whereClause: any = {
          status: "ACCEPTED",
          quantityMtr: { gt: 0 },
          ...cFilter,
        };
        if (item.product) {
          whereClause.product = { contains: item.product };
        }
        if (item.sizeLabel) {
          whereClause.sizeLabel = item.sizeLabel;
        }
        if (item.material) {
          whereClause.specification = { contains: item.material };
        }

        const availableStockItems = await prisma.inventoryStock.findMany({
          where: whereClause,
          orderBy: { mtcDate: "asc" },
          select: {
            id: true,
            heatNo: true,
            product: true,
            specification: true,
            sizeLabel: true,
            quantityMtr: true,
            pieces: true,
            mtcDate: true,
            mtcNo: true,
            make: true,
          },
        });

        const availableStockQty = availableStockItems.reduce(
          (sum, s) => sum + Number(s.quantityMtr), 0
        );

        let suggestedSource: string;
        let suggestedStockQty: number;
        let suggestedProcurementQty: number;

        if (remainingQty <= 0) {
          suggestedSource = "STOCK";
          suggestedStockQty = 0;
          suggestedProcurementQty = 0;
        } else if (availableStockQty >= remainingQty) {
          suggestedSource = "STOCK";
          suggestedStockQty = remainingQty;
          suggestedProcurementQty = 0;
        } else if (availableStockQty > 0) {
          suggestedSource = "SPLIT";
          suggestedStockQty = Math.round(availableStockQty * 1000) / 1000;
          suggestedProcurementQty = Math.round((remainingQty - availableStockQty) * 1000) / 1000;
        } else {
          suggestedSource = "PROCUREMENT";
          suggestedStockQty = 0;
          suggestedProcurementQty = remainingQty;
        }

        return {
          salesOrderItemId: item.id,
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          sizeLabel: item.sizeLabel,
          orderedQty,
          existingReservations,
          remainingQty,
          availableStockQty: Math.round(availableStockQty * 1000) / 1000,
          availableStockItems: availableStockItems.map((s) => ({
            ...s,
            quantityMtr: Number(s.quantityMtr),
          })),
          suggestedSource,
          suggestedStockQty,
          suggestedProcurementQty,
          currentAllotment: item.allotmentSource
            ? {
                source: item.allotmentSource,
                stockQty: item.stockAllocQty ? Number(item.stockAllocQty) : 0,
                procurementQty: item.procurementAllocQty ? Number(item.procurementAllocQty) : 0,
                status: item.allotmentStatus,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ items: analysisItems });
  } catch (error) {
    console.error("Error analyzing allotment:", error);
    return NextResponse.json({ error: "Failed to analyze stock availability" }, { status: 500 });
  }
}
