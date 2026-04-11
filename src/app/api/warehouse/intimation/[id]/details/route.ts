import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { MPRStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("warehouseIntimation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const intimation = await prisma.warehouseIntimation.findUnique({
      where: { id },
      select: {
        id: true,
        mprNo: true,
        status: true,
        items: {
          orderBy: { sNo: "asc" },
          include: {
            salesOrderItem: {
              select: { id: true, sNo: true, product: true, material: true, sizeLabel: true, quantity: true },
            },
            details: {
              orderBy: { sNo: "asc" },
              include: {
                inventoryStock: {
                  select: { id: true, heatNo: true, make: true, quantityMtr: true, mtcNo: true, mtcDate: true },
                },
              },
            },
          },
        },
      },
    });

    if (!intimation) {
      return NextResponse.json({ error: "Warehouse Intimation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: intimation.id,
      mprNo: intimation.mprNo,
      status: intimation.status,
      items: intimation.items.map((item) => ({
        id: item.id,
        sNo: item.sNo,
        product: item.product,
        material: item.material,
        sizeLabel: item.sizeLabel,
        additionalSpec: item.additionalSpec,
        requiredQty: Number(item.requiredQty),
        preparedQty: Number(item.preparedQty),
        itemStatus: item.itemStatus,
        inspectionStatus: item.inspectionStatus,
        testingStatus: item.testingStatus,
        salesOrderItem: item.salesOrderItem
          ? { ...item.salesOrderItem, quantity: Number(item.salesOrderItem.quantity) }
          : null,
        details: item.details.map((d) => ({
          id: d.id,
          sNo: d.sNo,
          lengthMtr: d.lengthMtr ? Number(d.lengthMtr) : null,
          pieces: d.pieces,
          make: d.make,
          heatNo: d.heatNo,
          mtcNo: d.mtcNo,
          mtcDate: d.mtcDate,
          inventoryStockId: d.inventoryStockId,
          remarks: d.remarks,
          status: d.status,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching intimation details:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { warehouseIntimationItemId, details } = body;

    if (!warehouseIntimationItemId || !details || !Array.isArray(details)) {
      return NextResponse.json({ error: "warehouseIntimationItemId and details array are required" }, { status: 400 });
    }

    // Validate item belongs to this intimation
    const item = await prisma.warehouseIntimationItem.findFirst({
      where: { id: warehouseIntimationItemId, warehouseIntimationId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in this intimation" }, { status: 400 });
    }

    // Upsert details
    for (const detail of details) {
      if (detail.id) {
        // Update existing
        await prisma.warehouseItemDetail.update({
          where: { id: detail.id },
          data: {
            sNo: detail.sNo,
            lengthMtr: detail.lengthMtr ? parseFloat(detail.lengthMtr) : null,
            pieces: detail.pieces ? parseInt(detail.pieces) : null,
            make: detail.make || null,
            heatNo: detail.heatNo || null,
            inventoryStockId: detail.inventoryStockId || null,
            remarks: detail.remarks || null,
          },
        });
      } else {
        // Create new
        await prisma.warehouseItemDetail.create({
          data: {
            warehouseIntimationItemId,
            sNo: detail.sNo,
            lengthMtr: detail.lengthMtr ? parseFloat(detail.lengthMtr) : null,
            pieces: detail.pieces ? parseInt(detail.pieces) : null,
            make: detail.make || null,
            heatNo: detail.heatNo || null,
            inventoryStockId: detail.inventoryStockId || null,
            remarks: detail.remarks || null,
            status: "PENDING",
          },
        });
      }
    }

    // Recalculate preparedQty from details
    const allDetails = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId },
    });

    const totalLength = allDetails.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );

    // Determine item status
    const hasDetails = allDetails.length > 0;
    const allHaveMtc = hasDetails && allDetails.every((d) => d.mtcNo && d.mtcDate);
    let newItemStatus = item.itemStatus;
    if (allHaveMtc) {
      newItemStatus = "READY";
    } else if (hasDetails) {
      newItemStatus = "PREPARING";
    }

    await prisma.warehouseIntimationItem.update({
      where: { id: warehouseIntimationItemId },
      data: {
        preparedQty: totalLength,
        heatNo: allDetails.map((d) => d.heatNo).filter(Boolean).join(", "),
        itemStatus: newItemStatus,
      },
    });

    // Auto-update MPR status
    const allItems = await prisma.warehouseIntimationItem.findMany({
      where: { warehouseIntimationId: id },
    });

    const allReady = allItems.every((i) => i.itemStatus === "READY" || i.itemStatus === "ISSUED");
    const anyInProgress = allItems.some((i) => i.itemStatus === "PREPARING" || i.itemStatus === "READY");

    let mprStatus: MPRStatus | undefined;
    if (allReady && allItems.length > 0) {
      mprStatus = MPRStatus.MATERIAL_READY;
    } else if (anyInProgress) {
      mprStatus = MPRStatus.IN_PROGRESS;
    }

    if (mprStatus) {
      await prisma.warehouseIntimation.update({
        where: { id },
        data: { status: mprStatus },
      });
    }

    return NextResponse.json({ success: true, preparedQty: totalLength, itemStatus: newItemStatus });
  } catch (error) {
    console.error("Error saving details:", error);
    return NextResponse.json({ error: "Failed to save details" }, { status: 500 });
  }
}
