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

    const qty = parseFloat(reservedQtyMtr);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Use transaction with row-level locking to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get SO item with existing reservations
      const soItem = await tx.salesOrderItem.findUnique({
        where: { id: soItemId },
        include: {
          stockReservations: {
            where: { status: "RESERVED" },
            select: { reservedQtyMtr: true },
          },
        },
      });

      if (!soItem) {
        throw new Error("SO Item not found");
      }

      // Check if reservation would exceed SO item quantity
      const alreadyReserved = soItem.stockReservations.reduce(
        (sum, r) => sum + Number(r.reservedQtyMtr),
        0
      );
      const remaining = Number(soItem.quantity) - alreadyReserved;

      if (qty > remaining + 0.001) {
        throw new Error(
          `Cannot reserve ${qty.toFixed(3)} Mtr. Only ${remaining.toFixed(3)} Mtr remaining for this item.`
        );
      }

      // Lock and check stock availability
      // Use raw query for row-level lock (SELECT ... FOR UPDATE)
      const stocks = await tx.$queryRaw<Array<{ id: string; quantityMtr: any; status: string; heatNo: string | null; product: string | null; sizeLabel: string | null }>>`
        SELECT id, "quantityMtr", status, "heatNo", product, "sizeLabel"
        FROM "InventoryStock"
        WHERE id = ${inventoryStockId}
        FOR UPDATE
      `;

      if (stocks.length === 0) {
        throw new Error("Stock not found");
      }

      const inventoryStock = stocks[0];

      if (inventoryStock.status !== "ACCEPTED") {
        throw new Error("Stock is not in ACCEPTED status. Current: " + inventoryStock.status);
      }

      const availableQty = Number(inventoryStock.quantityMtr);

      if (qty > availableQty + 0.001) {
        throw new Error(
          `Insufficient stock. Available: ${availableQty.toFixed(3)} Mtr, Requested: ${qty.toFixed(3)} Mtr`
        );
      }

      // Create reservation
      const reservation = await tx.stockReservation.create({
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

      // Deduct from available stock quantity but keep status as ACCEPTED
      // so remaining stock is still available for other SOs
      const newQty = availableQty - qty;
      await tx.inventoryStock.update({
        where: { id: inventoryStockId },
        data: {
          quantityMtr: newQty,
          // Only set RESERVED if all quantity is now reserved (none left)
          ...(newQty <= 0.001 && { status: "RESERVED", reservedForSO: id }),
        },
      });

      return { reservation, inventoryStock };
    });

    // FIFO check — advisory warnings returned to user
    let fifoWarnings: string[] = [];
    const stock = result.inventoryStock;
    if (stock.heatNo && stock.product && stock.sizeLabel) {
      const fifoCheck = await validateFIFOReservation(
        stock.product,
        stock.sizeLabel,
        [stock.heatNo]
      );
      if (fifoCheck.warnings && fifoCheck.warnings.length > 0) {
        fifoWarnings = fifoCheck.warnings;
      }
    }

    return NextResponse.json(
      { ...result.reservation, fifoWarnings },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create reservation" },
      { status: error.message ? 400 : 500 }
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
    // Match by product, material/specification, AND sizeLabel
    const whereClause: any = {
      status: "ACCEPTED",
      quantityMtr: { gt: 0 },
    };

    if (soItem.product) {
      whereClause.product = { contains: soItem.product };
    }
    if (soItem.sizeLabel) {
      whereClause.sizeLabel = soItem.sizeLabel;
    }
    // Match material against specification field in InventoryStock
    if (soItem.material) {
      whereClause.specification = { contains: soItem.material };
    }

    const availableStock = await prisma.inventoryStock.findMany({
      where: whereClause,
      orderBy: { mtcDate: "asc" }, // FIFO
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

    return NextResponse.json({ availableStock });
  } catch (error) {
    console.error("Error fetching available stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch available stock" },
      { status: 500 }
    );
  }
}

// Release a stock reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Get reservation details
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
        include: {
          salesOrderItem: {
            select: { salesOrderId: true },
          },
        },
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      // Verify reservation belongs to this SO
      if (reservation.salesOrderItem.salesOrderId !== id) {
        throw new Error("Reservation does not belong to this Sales Order");
      }

      if (reservation.status !== "RESERVED") {
        throw new Error(`Cannot release reservation with status: ${reservation.status}`);
      }

      // Restore quantity to inventory stock
      const inventoryStock = await tx.inventoryStock.findUnique({
        where: { id: reservation.inventoryStockId },
      });

      if (inventoryStock) {
        const restoredQty = Number(inventoryStock.quantityMtr) + Number(reservation.reservedQtyMtr);
        await tx.inventoryStock.update({
          where: { id: reservation.inventoryStockId },
          data: {
            quantityMtr: restoredQty,
            status: "ACCEPTED",
            reservedForSO: null,
          },
        });
      }

      // Update reservation status
      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error releasing reservation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to release reservation" },
      { status: error.message ? 400 : 500 }
    );
  }
}
