import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("purchaseRequisition", "read");
    if (!authorized) return response!;

    const purchaseRequisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: { id: true, soNo: true, soDate: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        purchaseOrders: {
          select: { id: true, poNo: true, status: true },
        },
      },
    });

    if (!purchaseRequisition) {
      return NextResponse.json(
        { error: "Purchase requisition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ purchaseRequisition });
  } catch (error) {
    console.error("Error fetching purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase requisition" },
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
    const { authorized, session, response } = await checkAccess("purchaseRequisition", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, approvalRemarks } = body;

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id },
    });

    if (!pr) {
      return NextResponse.json(
        { error: "Purchase requisition not found" },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["PENDING_APPROVAL"],
      PENDING_APPROVAL: ["APPROVED", "REJECTED"],
      REJECTED: ["DRAFT"],
    };

    if (
      validTransitions[pr.status] &&
      !validTransitions[pr.status].includes(status)
    ) {
      return NextResponse.json(
        { error: `Cannot transition from ${pr.status} to ${status}` },
        { status: 400 }
      );
    }

    // Role check: Only MANAGEMENT and ADMIN can approve/reject
    if (status === "APPROVED" || status === "REJECTED") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (user?.role !== "MANAGEMENT" && user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only Management or Admin can approve/reject purchase requisitions" },
          { status: 403 }
        );
      }
    }

    const updateData: any = { status };

    if (status === "APPROVED") {
      updateData.approvedById = session.user.id;
      updateData.approvalDate = new Date();
      if (approvalRemarks) updateData.approvalRemarks = approvalRemarks;
    }

    if (status === "REJECTED") {
      updateData.approvedById = session.user.id;
      updateData.approvalDate = new Date();
      if (approvalRemarks) updateData.approvalRemarks = approvalRemarks;
    }

    if (status === "DRAFT") {
      // Reverting to draft - clear approval fields
      updateData.approvedById = null;
      updateData.approvalDate = null;
      updateData.approvalRemarks = null;
    }

    const updated = await prisma.purchaseRequisition.update({
      where: { id },
      data: updateData,
      include: {
        salesOrder: {
          select: { id: true, soNo: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        purchaseOrders: {
          select: { id: true, poNo: true, status: true },
        },
      },
    });

    // Determine audit action
    const auditAction = status === "APPROVED" ? "APPROVE"
      : status === "REJECTED" ? "REJECT"
      : status === "PENDING_APPROVAL" ? "SUBMIT_FOR_APPROVAL"
      : "STATUS_CHANGE";

    createAuditLog({
      userId: session.user.id,
      action: auditAction,
      tableName: "PurchaseRequisition",
      recordId: id,
      fieldName: "status",
      oldValue: pr.status,
      newValue: status,
    }).catch(console.error);

    return NextResponse.json({ purchaseRequisition: updated });
  } catch (error) {
    console.error("Error updating purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to update purchase requisition" },
      { status: 500 }
    );
  }
}
