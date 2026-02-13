import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
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
        { plNo: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const packingLists = await prisma.packingList.findMany({
      where,
      include: {
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
        items: {
          include: {
            inventoryStock: {
              select: {
                id: true,
                heatNo: true,
                sizeLabel: true,
                product: true,
                status: true,
              },
            },
          },
        },
        dispatchNotes: {
          select: {
            id: true,
            dnNo: true,
            dispatchDate: true,
          },
        },
      },
      orderBy: { plDate: "desc" },
    });

    return NextResponse.json({ packingLists });
  } catch (error) {
    console.error("Error fetching packing lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing lists" },
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
    const { salesOrderId, remarks, items } = body;

    if (!salesOrderId) {
      return NextResponse.json(
        { error: "Sales Order is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Verify sales order exists
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales Order not found" },
        { status: 404 }
      );
    }

    // Verify all inventory stock items exist and are in RESERVED or ACCEPTED status
    for (const item of items) {
      const stock = await prisma.inventoryStock.findUnique({
        where: { id: item.inventoryStockId },
      });

      if (!stock) {
        return NextResponse.json(
          { error: `Inventory stock not found: ${item.inventoryStockId}` },
          { status: 404 }
        );
      }

      if (stock.status !== "RESERVED" && stock.status !== "ACCEPTED") {
        return NextResponse.json(
          { error: `Stock ${stock.heatNo || stock.id} is not in RESERVED or ACCEPTED status` },
          { status: 400 }
        );
      }
    }

    const plNo = await generateDocumentNumber("PACKING_LIST");

    const packingList = await prisma.packingList.create({
      data: {
        plNo,
        salesOrderId,
        remarks: remarks || null,
        items: {
          create: items.map((item: any) => ({
            inventoryStockId: item.inventoryStockId,
            heatNo: item.heatNo || null,
            sizeLabel: item.sizeLabel || null,
            material: item.material || null,
            quantityMtr: parseFloat(item.quantityMtr) || 0,
            pieces: parseInt(item.pieces) || 0,
            bundleNo: item.bundleNo || null,
            grossWeightKg: item.grossWeightKg ? parseFloat(item.grossWeightKg) : null,
            netWeightKg: item.netWeightKg ? parseFloat(item.netWeightKg) : null,
            markingDetails: item.markingDetails || null,
          })),
        },
      },
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            customer: {
              select: { id: true, name: true },
            },
          },
        },
        items: {
          include: {
            inventoryStock: {
              select: {
                id: true,
                heatNo: true,
                sizeLabel: true,
                product: true,
                status: true,
              },
            },
          },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "PackingList",
      recordId: packingList.id,
      newValue: JSON.stringify({ plNo: packingList.plNo }),
    }).catch(console.error);

    return NextResponse.json(packingList, { status: 201 });
  } catch (error) {
    console.error("Error creating packing list:", error);
    return NextResponse.json(
      { error: "Failed to create packing list" },
      { status: 500 }
    );
  }
}
