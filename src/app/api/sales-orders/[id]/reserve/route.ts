import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
