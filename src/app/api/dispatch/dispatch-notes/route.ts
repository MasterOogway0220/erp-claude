import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { dnNo: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const dispatchNotes = await prisma.dispatchNote.findMany({
      where,
      include: {
        packingList: {
          select: {
            id: true,
            plNo: true,
            plDate: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            status: true,
            customer: {
              select: { id: true, name: true },
            },
          },
        },
        transporter: {
          select: {
            id: true,
            name: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { dispatchDate: "desc" },
    });

    return NextResponse.json({ dispatchNotes });
  } catch (error) {
    console.error("Error fetching dispatch notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      packingListId,
      salesOrderId,
      vehicleNo,
      lrNo,
      transporterId,
      destination,
      ewayBillNo,
      remarks,
    } = body;

    if (!packingListId) {
      return NextResponse.json(
        { error: "Packing List is required" },
        { status: 400 }
      );
    }

    if (!salesOrderId) {
      return NextResponse.json(
        { error: "Sales Order is required" },
        { status: 400 }
      );
    }

    // Verify packing list exists and load its items
    const packingList = await prisma.packingList.findUnique({
      where: { id: packingListId },
      include: {
        items: {
          select: {
            inventoryStockId: true,
          },
        },
      },
    });

    if (!packingList) {
      return NextResponse.json(
        { error: "Packing List not found" },
        { status: 404 }
      );
    }

    // Verify sales order exists
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: {
          include: {
            stockReservations: {
              where: { status: "RESERVED" },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales Order not found" },
        { status: 404 }
      );
    }

    const dnNo = await generateDocumentNumber("DISPATCH_NOTE");

    const inventoryStockIds = packingList.items.map(
      (item) => item.inventoryStockId
    );

    const dispatchNote = await prisma.$transaction(async (tx) => {
      // 1. Create the dispatch note
      const createdDN = await tx.dispatchNote.create({
        data: {
          dnNo,
          packingListId,
          salesOrderId,
          vehicleNo: vehicleNo || null,
          lrNo: lrNo || null,
          transporterId: transporterId || null,
          destination: destination || null,
          ewayBillNo: ewayBillNo || null,
          remarks: remarks || null,
        },
      });

      // 2. Update all inventory stock items from the packing list to DISPATCHED
      await tx.inventoryStock.updateMany({
        where: {
          id: { in: inventoryStockIds },
        },
        data: {
          status: "DISPATCHED",
        },
      });

      // 3. Update all related stock reservations to DISPATCHED
      await tx.stockReservation.updateMany({
        where: {
          inventoryStockId: { in: inventoryStockIds },
          status: "RESERVED",
        },
        data: {
          status: "DISPATCHED",
        },
      });

      // 4. Determine and update sales order status
      // Reload the sales order items with their reservations after the updates above
      const soItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId },
        include: {
          stockReservations: true,
        },
      });

      // Check if all reservations across all items are dispatched
      const allReservations = soItems.flatMap((item) => item.stockReservations);
      const hasReservations = allReservations.length > 0;
      const allDispatched =
        hasReservations &&
        allReservations.every((r) => r.status === "DISPATCHED");

      const newSOStatus = allDispatched
        ? "FULLY_DISPATCHED"
        : "PARTIALLY_DISPATCHED";

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: newSOStatus },
      });

      return createdDN;
    });

    // Return the full dispatch note with relations
    const fullDispatchNote = await prisma.dispatchNote.findUnique({
      where: { id: dispatchNote.id },
      include: {
        packingList: {
          select: {
            id: true,
            plNo: true,
            plDate: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            status: true,
            customer: {
              select: { id: true, name: true },
            },
          },
        },
        transporter: {
          select: { id: true, name: true },
        },
        invoices: true,
      },
    });

    return NextResponse.json(fullDispatchNote, { status: 201 });
  } catch (error) {
    console.error("Error creating dispatch note:", error);
    return NextResponse.json(
      { error: "Failed to create dispatch note" },
      { status: 500 }
    );
  }
}
