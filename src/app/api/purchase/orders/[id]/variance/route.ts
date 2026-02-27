import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { detectPOVariances } from "@/lib/business-logic/po-variance-detection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        salesOrder: {
          select: {
            id: true,
            quotationId: true,
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Need a linked quotation via Sales Order
    const quotationId = po.salesOrder?.quotationId;
    if (!quotationId) {
      return NextResponse.json(
        { hasVariances: false, items: [], warnings: [], requiresApproval: false }
      );
    }

    const report = await detectPOVariances(
      quotationId,
      po.items.map((item) => ({
        product: item.product,
        material: item.material,
        sizeId: (item as any).sizeId,
        sizeLabel: item.sizeLabel,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
      })),
      Number(po.totalAmount)
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error detecting PO variances:", error);
    return NextResponse.json(
      { error: "Failed to detect variances" },
      { status: 500 }
    );
  }
}
