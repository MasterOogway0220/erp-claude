import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("warehouseIntimation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { mprNo: { contains: search } },
        { salesOrder: { soNo: { contains: search } } },
        { salesOrder: { customer: { name: { contains: search } } } },
        { salesOrder: { customerPoNo: { contains: search } } },
      ];
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (priority && priority !== "all") {
      where.priority = priority;
    }

    const intimations = await prisma.warehouseIntimation.findMany({
      where,
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            status: true,
            customerPoNo: true,
            customer: { select: { id: true, name: true, city: true } },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            sNo: true,
            product: true,
            material: true,
            sizeLabel: true,
            requiredQty: true,
            preparedQty: true,
            inspectionStatus: true,
            testingStatus: true,
            itemStatus: true,
            heatNo: true,
          },
          orderBy: { sNo: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ intimations });
  } catch (error) {
    console.error("Error fetching warehouse intimations:", error);
    return NextResponse.json({ error: "Failed to fetch warehouse intimations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { salesOrderId, warehouseId, priority, requiredByDate, remarks, assignedToId, items } = body;

    if (!salesOrderId) {
      return NextResponse.json({ error: "Sales Order is required" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Validate Sales Order exists and is in valid state
    const so = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      select: { id: true, soNo: true, status: true, poAcceptanceStatus: true },
    });

    if (!so) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    if (so.status === "CANCELLED" || so.status === "CLOSED") {
      return NextResponse.json(
        { error: `Sales Order is ${so.status} and cannot have material preparation requests` },
        { status: 400 }
      );
    }

    // Validate warehouse if provided
    if (warehouseId) {
      const warehouse = await prisma.warehouseMaster.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
      }
    }

    const mprNo = await generateDocumentNumber("WAREHOUSE_INTIMATION", companyId);

    const intimation = await prisma.warehouseIntimation.create({
      data: {
        companyId,
        mprNo,
        salesOrderId,
        warehouseId: warehouseId || null,
        priority: priority || "NORMAL",
        requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
        remarks: remarks || null,
        createdById: session.user.id,
        assignedToId: assignedToId || null,
        status: "PENDING",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: item.sNo || index + 1,
            salesOrderItemId: item.salesOrderItemId || null,
            product: item.product || null,
            material: item.material || null,
            sizeLabel: item.sizeLabel || null,
            additionalSpec: item.additionalSpec || null,
            requiredQty: parseFloat(item.requiredQty) || 0,
            inspectionStatus: item.inspectionStatus || "PENDING",
            testingStatus: item.testingStatus || "PENDING",
            itemStatus: "PENDING",
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        salesOrder: {
          select: {
            soNo: true,
            customer: { select: { name: true } },
          },
        },
        warehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "WarehouseIntimation",
      recordId: intimation.id,
      newValue: JSON.stringify({ mprNo }),
    }).catch(console.error);

    return NextResponse.json(intimation, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse intimation:", error);
    return NextResponse.json({ error: "Failed to create warehouse intimation" }, { status: 500 });
  }
}
