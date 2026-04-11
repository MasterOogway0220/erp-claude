import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

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
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            status: true,
            customerPoNo: true,
            deliverySchedule: true,
            customer: { select: { id: true, name: true, city: true } },
            items: {
              select: {
                id: true,
                sNo: true,
                product: true,
                material: true,
                sizeLabel: true,
                quantity: true,
                qtyDispatched: true,
                itemStatus: true,
              },
              orderBy: { sNo: "asc" },
            },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        items: {
          include: {
            salesOrderItem: {
              select: { id: true, sNo: true, product: true, quantity: true, qtyDispatched: true },
            },
            inventoryStock: {
              select: {
                id: true,
                heatNo: true,
                status: true,
                quantityMtr: true,
                pieces: true,
                product: true,
                sizeLabel: true,
                specification: true,
                inspections: {
                  select: { id: true, overallResult: true, inspectionDate: true },
                  orderBy: { inspectionDate: "desc" },
                  take: 1,
                },
              },
            },
            details: {
              orderBy: { sNo: "asc" as const },
              select: {
                id: true,
                sNo: true,
                lengthMtr: true,
                pieces: true,
                make: true,
                heatNo: true,
                mtcNo: true,
                mtcDate: true,
                inventoryStockId: true,
                remarks: true,
                status: true,
              },
            },
          },
          orderBy: { sNo: "asc" },
        },
      },
    });

    if (!intimation) {
      return NextResponse.json({ error: "Warehouse intimation not found" }, { status: 404 });
    }

    // Transform items to include details with Decimal conversion
    const transformedIntimation = {
      ...intimation,
      items: (intimation as any).items?.map((item: any) => ({
        ...item,
        details: item.details?.map((d: any) => ({
          ...d,
          lengthMtr: d.lengthMtr ? Number(d.lengthMtr) : null,
        })) || [],
      })) || [],
    };

    return NextResponse.json(transformedIntimation);
  } catch (error) {
    console.error("Error fetching warehouse intimation:", error);
    return NextResponse.json({ error: "Failed to fetch warehouse intimation" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.warehouseIntimation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Warehouse intimation not found" }, { status: 404 });
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot update a cancelled intimation" }, { status: 400 });
    }

    const updateData: any = {};

    // Update top-level fields
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.warehouseId !== undefined) updateData.warehouseId = body.warehouseId || null;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.requiredByDate !== undefined) {
      updateData.requiredByDate = body.requiredByDate ? new Date(body.requiredByDate) : null;
    }

    // Update individual items if provided
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (!item.id) continue;
        const itemUpdate: any = {};
        if (item.itemStatus) itemUpdate.itemStatus = item.itemStatus;
        if (item.inspectionStatus) itemUpdate.inspectionStatus = item.inspectionStatus;
        if (item.testingStatus) itemUpdate.testingStatus = item.testingStatus;
        if (item.preparedQty !== undefined) itemUpdate.preparedQty = parseFloat(item.preparedQty) || 0;
        if (item.inventoryStockId !== undefined) itemUpdate.inventoryStockId = item.inventoryStockId || null;
        if (item.heatNo !== undefined) itemUpdate.heatNo = item.heatNo || null;
        if (item.remarks !== undefined) itemUpdate.remarks = item.remarks || null;

        if (Object.keys(itemUpdate).length > 0) {
          await prisma.warehouseIntimationItem.update({
            where: { id: item.id },
            data: itemUpdate,
          });
        }
      }
    }

    // Auto-compute overall status based on item statuses
    if (!body.status) {
      const updatedItems = await prisma.warehouseIntimationItem.findMany({
        where: { warehouseIntimationId: id },
      });

      const allReady = updatedItems.every((i) => i.itemStatus === "READY" || i.itemStatus === "ISSUED");
      const anyPreparing = updatedItems.some((i) => i.itemStatus === "PREPARING" || i.itemStatus === "READY");
      const allIssued = updatedItems.every((i) => i.itemStatus === "ISSUED");

      if (allIssued) {
        updateData.status = "DISPATCHED";
      } else if (allReady) {
        updateData.status = "MATERIAL_READY";
      } else if (anyPreparing) {
        updateData.status = "IN_PROGRESS";
      }
    }

    const updated = await prisma.warehouseIntimation.update({
      where: { id },
      data: updateData,
      include: {
        salesOrder: {
          select: {
            soNo: true,
            customer: { select: { name: true } },
          },
        },
        warehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        items: {
          include: {
            inventoryStock: {
              select: { id: true, heatNo: true, status: true },
            },
          },
          orderBy: { sNo: "asc" },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "UPDATE",
      tableName: "WarehouseIntimation",
      recordId: id,
      newValue: JSON.stringify(body),
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating warehouse intimation:", error);
    return NextResponse.json({ error: "Failed to update warehouse intimation" }, { status: 500 });
  }
}
