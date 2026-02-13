import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json({ purchaseOrder, receivedQty });
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Handle approval workflow actions
    if (action === "submit_for_approval") {
      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only DRAFT POs can be submitted for approval" },
          { status: 400 }
        );
      }
      updateData.status = "PENDING_APPROVAL";
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
      updateData.status = "DRAFT";
      updateData.approvalRemarks = approvalRemarks || null;
    } else if (action === "send_to_vendor") {
      if (existing.status !== "OPEN") {
        return NextResponse.json(
          { error: "Only OPEN POs can be sent to vendor" },
          { status: 400 }
        );
      }
      updateData.status = "SENT_TO_VENDOR";
    } else {
      // Legacy: direct field updates
      if (status) updateData.status = status;
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
      action: "UPDATE",
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
