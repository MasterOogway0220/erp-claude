import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { softDeleteData } from "@/lib/soft-delete";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("labReport", "read");
    if (!authorized) return response!;

    const labReport = await prisma.labReport.findUnique({
      where: { id, ...companyFilter(companyId) },
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true, vendor: { select: { id: true, name: true } } },
        },
        inventoryStock: {
          select: {
            id: true, heatNo: true, product: true, sizeLabel: true, specification: true,
            make: true, quantityMtr: true, pieces: true, status: true,
          },
        },
        grn: {
          select: { id: true, grnNo: true, grnDate: true },
        },
        uploadedBy: {
          select: { name: true },
        },
      },
    });

    if (!labReport) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    return NextResponse.json({ labReport });
  } catch (error) {
    console.error("Error fetching lab report:", error);
    return NextResponse.json({ error: "Failed to fetch lab report" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("labReport", "write");
    if (!authorized) return response!;

    const existing = await prisma.labReport.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true, result: true, filePath: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.filePath !== undefined) updateData.filePath = body.filePath;
    if (body.fileName !== undefined) updateData.fileName = body.fileName;
    if (body.labName !== undefined) updateData.labName = body.labName;
    if (body.testDate !== undefined) updateData.testDate = body.testDate ? new Date(body.testDate) : null;
    if (body.result !== undefined) updateData.result = body.result;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.itemCode !== undefined) updateData.itemCode = body.itemCode;
    if (body.poId !== undefined) updateData.poId = body.poId || null;
    if (body.inventoryStockId !== undefined) updateData.inventoryStockId = body.inventoryStockId || null;
    if (body.grnId !== undefined) updateData.grnId = body.grnId || null;

    const labReport = await prisma.labReport.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true },
        },
        uploadedBy: {
          select: { name: true },
        },
      },
    });

    if (body.result && body.result !== existing.result) {
      createAuditLog({
        userId: session.user.id,
        companyId,
        action: "UPDATE",
        tableName: "LabReport",
        recordId: id,
        fieldName: "result",
        oldValue: existing.result || "",
        newValue: body.result,
      }).catch(console.error);
    }

    return NextResponse.json({ labReport });
  } catch (error) {
    console.error("Error updating lab report:", error);
    return NextResponse.json({ error: "Failed to update lab report" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("labReport", "delete");
    if (!authorized) return response!;

    const existing = await prisma.labReport.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true, reportNo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    await prisma.labReport.update({ where: { id }, data: softDeleteData() });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "DELETE",
      tableName: "LabReport",
      recordId: id,
      oldValue: JSON.stringify({ reportNo: existing.reportNo }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lab report:", error);
    return NextResponse.json({ error: "Failed to delete lab report" }, { status: 500 });
  }
}
