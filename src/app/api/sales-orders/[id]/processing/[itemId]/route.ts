import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const { id, itemId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["PROCESS", "REOPEN"].includes(action)) {
      return NextResponse.json({ error: "action must be 'PROCESS' or 'REOPEN'" }, { status: 400 });
    }

    // Validate the processing item exists and belongs to this SO
    const processingItem = await prisma.orderProcessingItem.findUnique({
      where: { salesOrderItemId: itemId },
      include: {
        salesOrderItem: { select: { salesOrderId: true } },
      },
    });

    if (!processingItem || processingItem.salesOrderItem.salesOrderId !== id) {
      return NextResponse.json({ error: "Processing item not found for this Sales Order" }, { status: 404 });
    }

    if (action === "PROCESS") {
      await prisma.orderProcessingItem.update({
        where: { salesOrderItemId: itemId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          processedById: session.user.id,
        },
      });
    } else {
      await prisma.orderProcessingItem.update({
        where: { salesOrderItemId: itemId },
        data: {
          status: "PENDING",
          processedAt: null,
          processedById: null,
        },
      });
    }

    // Update SO processingStatus
    const allItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
      include: { orderProcessing: { select: { status: true } } },
    });

    const processedCount = allItems.filter(
      (i) => i.orderProcessing?.status === "PROCESSED"
    ).length;
    const hasProcessing = allItems.some((i) => i.orderProcessing);

    let newStatus = "UNPROCESSED";
    if (processedCount === allItems.length && processedCount > 0) {
      newStatus = "PROCESSED";
    } else if (processedCount > 0 || hasProcessing) {
      newStatus = "PROCESSING";
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { processingStatus: newStatus },
    });

    return NextResponse.json({
      success: true,
      itemStatus: action === "PROCESS" ? "PROCESSED" : "PENDING",
      soProcessingStatus: newStatus,
    });
  } catch (error) {
    console.error("Error updating processing item status:", error);
    return NextResponse.json({ error: "Failed to update processing status" }, { status: 500 });
  }
}
