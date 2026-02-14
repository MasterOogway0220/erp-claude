import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

/**
 * Valid Purchase Order status transitions
 * PRD §5.2 - Purchase Order lifecycle with approval workflow
 */
const VALID_PO_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["OPEN", "DRAFT", "CANCELLED"],
  OPEN: ["SENT_TO_VENDOR", "CANCELLED"],
  SENT_TO_VENDOR: ["PARTIALLY_RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["FULLY_RECEIVED", "CANCELLED"],
  FULLY_RECEIVED: ["CLOSED", "CANCELLED"],
  CLOSED: ["CANCELLED"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        salesOrder: {
          select: { id: true, soNo: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        goodsReceiptNotes: {
          select: {
            id: true,
            grnNo: true,
            grnDate: true,
            items: {
              select: {
                receivedQtyMtr: true,
              },
            },
          },
        },
        parentPo: {
          select: {
            id: true,
            poNo: true,
            version: true,
          },
        },
        childPos: {
          select: {
            id: true,
            poNo: true,
            version: true,
            createdAt: true,
          },
          orderBy: { version: "asc" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Fetch approvedBy user separately if approvedById is set
    // (PurchaseOrder doesn't have a Prisma relation for approvedBy)
    let approvedByUser = null;
    if (purchaseOrder.approvedById) {
      approvedByUser = await prisma.user.findUnique({
        where: { id: purchaseOrder.approvedById },
        select: { id: true, name: true, email: true },
      });
    }

    // Calculate received quantities
    const receivedQty = purchaseOrder.goodsReceiptNotes.reduce(
      (sum, grn) =>
        sum +
        grn.items.reduce(
          (itemSum, item) => itemSum + Number(item.receivedQtyMtr),
          0
        ),
      0
    );

    return NextResponse.json({
      purchaseOrder: {
        ...purchaseOrder,
        approvedBy: approvedByUser,
      },
      receivedQty,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
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
    const { authorized, session, response } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { action, deliveryDate, specialRequirements, approvalRemarks, status, followUpNotes } = body;

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const updateData: any = {};
    let auditAction: "UPDATE" | "APPROVE" | "REJECT" | "SUBMIT_FOR_APPROVAL" | "STATUS_CHANGE" = "UPDATE";

    // Handle approval workflow actions
    if (action === "submit_for_approval") {
      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only DRAFT POs can be submitted for approval" },
          { status: 400 }
        );
      }
      updateData.status = "PENDING_APPROVAL";
      // Clear any previous approval data when resubmitting
      updateData.approvedById = null;
      updateData.approvalDate = null;
      updateData.approvalRemarks = null;
      auditAction = "SUBMIT_FOR_APPROVAL";
    } else if (action === "approve") {
      if (existing.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only PENDING_APPROVAL POs can be approved" },
          { status: 400 }
        );
      }
      // Role check: only MANAGEMENT or ADMIN can approve
      const userRole = session.user.role;
      if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Only MANAGEMENT or ADMIN can approve POs" },
          { status: 403 }
        );
      }
      updateData.status = "OPEN";
      updateData.approvedById = session.user.id;
      updateData.approvalDate = new Date();
      updateData.approvalRemarks = approvalRemarks || null;
      auditAction = "APPROVE";
    } else if (action === "reject") {
      if (existing.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only PENDING_APPROVAL POs can be rejected" },
          { status: 400 }
        );
      }
      const userRole = session.user.role;
      if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Only MANAGEMENT or ADMIN can reject POs" },
          { status: 403 }
        );
      }
      // Remarks are mandatory when rejecting
      if (!approvalRemarks || !approvalRemarks.trim()) {
        return NextResponse.json(
          { error: "Remarks are required when rejecting a Purchase Order" },
          { status: 400 }
        );
      }
      updateData.status = "DRAFT";
      updateData.approvalRemarks = approvalRemarks;
      // Clear approval fields on rejection
      updateData.approvedById = null;
      updateData.approvalDate = null;
      auditAction = "REJECT";
    } else if (action === "send_to_vendor") {
      if (existing.status !== "OPEN") {
        return NextResponse.json(
          { error: "Only OPEN POs can be sent to vendor" },
          { status: 400 }
        );
      }
      updateData.status = "SENT_TO_VENDOR";
      auditAction = "STATUS_CHANGE";
    } else {
      // Legacy: direct field updates
      if (status) {
        // Enforce status transition rules for direct status updates
        const allowedTransitions = VALID_PO_STATUS_TRANSITIONS[existing.status];
        if (!allowedTransitions || !allowedTransitions.includes(status)) {
          return NextResponse.json(
            {
              error: `Invalid status transition. Cannot move from ${existing.status} to ${status}. Allowed transitions: ${allowedTransitions?.join(", ") || "none"}`,
            },
            { status: 400 }
          );
        }

        // Approval workflow enforcement for direct status changes
        if (existing.status === "PENDING_APPROVAL" && status === "OPEN") {
          // Approval via direct status - enforce role check
          const userRole = session.user.role;
          if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
            return NextResponse.json(
              { error: "Only MANAGEMENT or ADMIN can approve POs" },
              { status: 403 }
            );
          }
          updateData.approvedById = session.user.id;
          updateData.approvalDate = new Date();
          updateData.approvalRemarks = approvalRemarks || null;
          auditAction = "APPROVE";
        } else if (existing.status === "PENDING_APPROVAL" && status === "DRAFT") {
          // Rejection via direct status - enforce role check
          const userRole = session.user.role;
          if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
            return NextResponse.json(
              { error: "Only MANAGEMENT or ADMIN can reject POs" },
              { status: 403 }
            );
          }
          updateData.approvedById = null;
          updateData.approvalDate = null;
          updateData.approvalRemarks = approvalRemarks || null;
          auditAction = "REJECT";
        } else {
          auditAction = "STATUS_CHANGE";
        }

        updateData.status = status;
      }
      if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
      if (specialRequirements !== undefined) updateData.specialRequirements = specialRequirements;
      if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        vendor: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: auditAction,
      tableName: "PurchaseOrder",
      recordId: id,
      fieldName: "status",
      oldValue: existing.status,
      newValue: purchaseOrder.status,
    }).catch(console.error);

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}
