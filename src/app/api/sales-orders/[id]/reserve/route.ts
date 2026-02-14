import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { validateFIFOReservation } from "@/lib/validators/business-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    // Enforce PO acceptance before stock reservation (ISO 9001:2018 §8.2.3)
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: { poAcceptanceStatus: true },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    if (salesOrder.poAcceptanceStatus !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Customer PO must be reviewed and accepted before reserving stock. Current status: " + salesOrder.poAcceptanceStatus },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { soItemId, inventoryStockId, reservedQtyMtr, reservedPieces } = body;

    if (!soItemId || !inventoryStockId || !reservedQtyMtr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if stock is available
    const inventoryStock = await prisma.inventoryStock.findUnique({
      where: { id: inventoryStockId },
    });

    if (!inventoryStock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    if (inventoryStock.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Stock is not in ACCEPTED status" },
        { status: 400 }
      );
    }

    const qty = parseFloat(reservedQtyMtr);
    const availableQty = parseFloat(inventoryStock.quantityMtr.toString());

    if (qty > availableQty) {
      return NextResponse.json(
        { error: "Insufficient stock quantity" },
        { status: 400 }
      );
    }

    // FIFO check - warn if not reserving oldest stock first
    if (inventoryStock.heatNo && inventoryStock.product && inventoryStock.sizeLabel) {
      const fifoCheck = await validateFIFOReservation(
        inventoryStock.product,
        inventoryStock.sizeLabel,
        [inventoryStock.heatNo]
      );
      // FIFO is advisory, include warnings in response but don't block
      if (fifoCheck.warnings && fifoCheck.warnings.length > 0) {
        // Log but proceed - FIFO is a recommendation per PRD
        console.log("FIFO advisory:", fifoCheck.warnings.join("; "));
      }
    }

    // Create reservation
    const reservation = await prisma.stockReservation.create({
      data: {
        salesOrderItemId: soItemId,
        inventoryStockId,
        reservedQtyMtr: qty,
        reservedPieces: reservedPieces || 0,
      },
      include: {
        inventoryStock: true,
      },
    });

    // Update inventory stock
    await prisma.inventoryStock.update({
      where: { id: inventoryStockId },
      data: {
        status: "RESERVED",
        reservedForSO: id,
        quantityMtr: availableQty - qty,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}

// Get available stock for reservation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: _id } = await params;
    const { authorized, session, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const soItemId = searchParams.get("soItemId");

    if (!soItemId) {
      return NextResponse.json(
        { error: "SO Item ID is required" },
        { status: 400 }
      );
    }

    // Get SO item details
    const soItem = await prisma.salesOrderItem.findUnique({
      where: { id: soItemId },
    });

    if (!soItem) {
      return NextResponse.json({ error: "SO Item not found" }, { status: 404 });
    }

    // Find matching available stock (FIFO by MTC date)
    const availableStock = await prisma.inventoryStock.findMany({
      where: {
        status: "ACCEPTED",
        ...(soItem.product && { product: { contains: soItem.product } }),
        ...(soItem.sizeLabel && { sizeLabel: soItem.sizeLabel }),
        quantityMtr: { gt: 0 },
      },
      orderBy: { mtcDate: "asc" }, // FIFO
    });

    return NextResponse.json({ availableStock });
  } catch (error) {
    console.error("Error fetching available stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch available stock" },
      { status: 500 }
    );
  }
}
