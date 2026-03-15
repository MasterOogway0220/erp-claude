import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const rfq = await prisma.rFQ.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        purchaseRequisition: {
          include: {
            items: {
              orderBy: { sNo: "asc" },
            },
            salesOrder: {
              select: { id: true, soNo: true },
            },
          },
        },
        vendors: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
            quotation: {
              include: {
                items: {
                  orderBy: { sNo: "asc" },
                },
              },
            },
          },
        },
        comparativeStatement: {
          select: { id: true, csNo: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ rfq });
  } catch (error) {
    console.error("Error fetching RFQ:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, remarks, submissionDeadline } = body;

    const rfq = await prisma.rFQ.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: { vendors: true },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    if (submissionDeadline !== undefined) {
      updateData.submissionDeadline = submissionDeadline ? new Date(submissionDeadline) : null;
    }

    // When status changes to SENT, update all vendor sentDate to now
    if (status === "SENT") {
      await prisma.rFQVendor.updateMany({
        where: { rfqId: id },
        data: { sentDate: new Date() },
      });
    }

    const updated = await prisma.rFQ.update({
      where: { id },
      data: updateData,
      include: {
        purchaseRequisition: {
          include: {
            items: {
              orderBy: { sNo: "asc" },
            },
          },
        },
        vendors: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
            quotation: {
              include: {
                items: {
                  orderBy: { sNo: "asc" },
                },
              },
            },
          },
        },
        comparativeStatement: {
          select: { id: true, csNo: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: status ? "STATUS_CHANGE" : "UPDATE",
      tableName: "RFQ",
      recordId: id,
      fieldName: status ? "status" : undefined,
      oldValue: status ? rfq.status : undefined,
      newValue: status || JSON.stringify({ remarks, submissionDeadline }),
      companyId,
    }).catch(console.error);

    return NextResponse.json({ rfq: updated });
  } catch (error) {
    console.error("Error updating RFQ:", error);
    return NextResponse.json(
      { error: "Failed to update RFQ" },
      { status: 500 }
    );
  }
}
