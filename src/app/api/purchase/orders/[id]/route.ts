import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        salesOrder: {
          select: { id: true, soNo: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        goodsReceiptNotes: {
          select: {
            id: true,
            grnNo: true,
            grnDate: true,
            items: {
              select: {
                receivedQtyMtr: true,
              },
            },
          },
        },
        parentPo: {
          select: {
            id: true,
            poNo: true,
            version: true,
          },
        },
        childPos: {
          select: {
            id: true,
            poNo: true,
            version: true,
            createdAt: true,
          },
          orderBy: { version: "asc" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Calculate received quantities
    const receivedQty = purchaseOrder.goodsReceiptNotes.reduce(
      (sum, grn) =>
        sum +
        grn.items.reduce(
          (itemSum, item) => itemSum + Number(item.receivedQtyMtr),
          0
        ),
      0
    );

    return NextResponse.json({ purchaseOrder, receivedQty });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, deliveryDate, specialRequirements } = body;

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: status || undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        specialRequirements: specialRequirements || undefined,
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}
