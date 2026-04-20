import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { MPRItemStatus, MPRStatus } from "@prisma/client";
import { softDeleteData } from "@/lib/soft-delete";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id, detailId } = await params;
    const body = await request.json();

    const detail = await prisma.warehouseItemDetail.findUnique({
      where: { id: detailId },
      include: {
        warehouseIntimationItem: { select: { warehouseIntimationId: true, id: true } },
      },
    });

    if (!detail || detail.warehouseIntimationItem.warehouseIntimationId !== id) {
      return NextResponse.json({ error: "Detail not found in this intimation" }, { status: 404 });
    }

    const userRole = session.user?.role;
    const isQA = ["QC", "ADMIN", "SUPER_ADMIN"].includes(userRole);

    // Build update data based on role
    const updateData: any = {};

    // Warehouse team fields
    if (body.lengthMtr !== undefined) updateData.lengthMtr = body.lengthMtr ? parseFloat(body.lengthMtr) : null;
    if (body.pieces !== undefined) updateData.pieces = body.pieces ? parseInt(body.pieces) : null;
    if (body.make !== undefined) updateData.make = body.make || null;
    if (body.heatNo !== undefined) updateData.heatNo = body.heatNo || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.inventoryStockId !== undefined) updateData.inventoryStockId = body.inventoryStockId || null;

    // QA-only fields (MTC)
    if (body.mtcNo !== undefined || body.mtcDate !== undefined) {
      if (!isQA) {
        return NextResponse.json({ error: "Only QA team can update MTC details" }, { status: 403 });
      }
      if (body.mtcNo !== undefined) updateData.mtcNo = body.mtcNo || null;
      if (body.mtcDate !== undefined) updateData.mtcDate = body.mtcDate ? new Date(body.mtcDate) : null;
    }

    // Auto-update detail status
    const updatedMtcNo = body.mtcNo !== undefined ? body.mtcNo : detail.mtcNo;
    const updatedMtcDate = body.mtcDate !== undefined ? body.mtcDate : detail.mtcDate;
    if (updatedMtcNo && updatedMtcDate) {
      updateData.status = "READY";
    } else {
      updateData.status = "PENDING";
    }

    await prisma.warehouseItemDetail.update({
      where: { id: detailId },
      data: updateData,
    });

    // Recalculate parent item
    const parentItemId = detail.warehouseIntimationItem.id;
    const allDetails = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId: parentItemId },
    });

    const totalLength = allDetails.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );
    const hasDetails = allDetails.length > 0;
    const allHaveMtc = hasDetails && allDetails.every((d) => {
      const mNo = d.id === detailId ? (body.mtcNo !== undefined ? body.mtcNo : d.mtcNo) : d.mtcNo;
      const mDt = d.id === detailId ? (body.mtcDate !== undefined ? body.mtcDate : d.mtcDate) : d.mtcDate;
      return mNo && mDt;
    });

    let newItemStatus: MPRItemStatus;
    if (allHaveMtc) {
      newItemStatus = MPRItemStatus.READY;
    } else if (hasDetails) {
      newItemStatus = MPRItemStatus.PREPARING;
    } else {
      newItemStatus = MPRItemStatus.PENDING;
    }

    await prisma.warehouseIntimationItem.update({
      where: { id: parentItemId },
      data: { preparedQty: totalLength, itemStatus: newItemStatus },
    });

    // Auto-update MPR status
    const allItems = await prisma.warehouseIntimationItem.findMany({
      where: { warehouseIntimationId: id },
    });

    const allReady = allItems.every((i) => {
      const status = i.id === parentItemId ? newItemStatus : i.itemStatus;
      return status === "READY" || status === "ISSUED";
    });
    const anyInProgress = allItems.some((i) => {
      const status = i.id === parentItemId ? newItemStatus : i.itemStatus;
      return status === "PREPARING" || status === "READY";
    });

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

      // Create alert for QC when MATERIAL_READY
      if (mprStatus === "MATERIAL_READY") {
        const mpr = await prisma.warehouseIntimation.findUnique({
          where: { id },
          select: { mprNo: true, companyId: true },
        });
        if (mpr?.companyId) {
          await prisma.alert.create({
            data: {
              companyId: mpr.companyId,
              type: "MATERIAL_PREPARATION",
              title: `Material Ready: ${mpr.mprNo}`,
              message: "All items have MTC details filled. Ready for inspection offer generation.",
              severity: "MEDIUM",
              status: "UNREAD",
              relatedModule: "WarehouseIntimation",
              relatedId: id,
              assignedToRole: "QC",
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, detailStatus: updateData.status, itemStatus: newItemStatus });
  } catch (error) {
    console.error("Error updating detail:", error);
    return NextResponse.json({ error: "Failed to update detail" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id, detailId } = await params;

    const detail = await prisma.warehouseItemDetail.findUnique({
      where: { id: detailId },
      include: {
        warehouseIntimationItem: { select: { warehouseIntimationId: true, id: true } },
      },
    });

    if (!detail || detail.warehouseIntimationItem.warehouseIntimationId !== id) {
      return NextResponse.json({ error: "Detail not found" }, { status: 404 });
    }

    if (detail.status !== "PENDING") {
      return NextResponse.json({ error: "Can only delete PENDING details" }, { status: 400 });
    }

    await prisma.warehouseItemDetail.update({ where: { id: detailId }, data: softDeleteData() });

    // Recalculate parent
    const parentItemId = detail.warehouseIntimationItem.id;
    const remaining = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId: parentItemId },
    });

    const totalLength = remaining.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );

    const newStatus: MPRItemStatus = remaining.length === 0 ? MPRItemStatus.PENDING :
      remaining.every((d) => d.mtcNo && d.mtcDate) ? MPRItemStatus.READY : MPRItemStatus.PREPARING;

    await prisma.warehouseIntimationItem.update({
      where: { id: parentItemId },
      data: { preparedQty: totalLength, itemStatus: newStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting detail:", error);
    return NextResponse.json({ error: "Failed to delete detail" }, { status: 500 });
  }
}
