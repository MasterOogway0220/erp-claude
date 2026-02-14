import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

/**
 * Valid Sales Order status transitions
 * PRD §4.2 - Sales Order lifecycle
 */
const VALID_SO_STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["PARTIALLY_DISPATCHED", "CANCELLED"],
  PARTIALLY_DISPATCHED: ["FULLY_DISPATCHED", "CANCELLED"],
  FULLY_DISPATCHED: ["CLOSED"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        items: {
          orderBy: { sNo: "asc" },
          include: {
            stockReservations: {
              include: {
                inventoryStock: true,
              },
            },
          },
        },
        purchaseRequisitions: {
          select: {
            id: true,
            prNo: true,
            status: true,
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    return NextResponse.json({ salesOrder });
  } catch (error) {
    console.error("Error fetching sales order:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales order" },
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
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, poAcceptanceStatus, poReviewRemarks } = body;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true, poAcceptanceStatus: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    // Enforce status transition rules when status field is being set
    if (status) {
      const allowedTransitions = VALID_SO_STATUS_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition. Cannot move from ${existing.status} to ${status}. Allowed transitions: ${allowedTransitions?.join(", ") || "none"}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(poAcceptanceStatus && { poAcceptanceStatus }),
        ...(poReviewRemarks !== undefined && { poReviewRemarks }),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "SalesOrder",
      recordId: id,
      fieldName: "status",
      oldValue: existing?.status || undefined,
      newValue: updated.status,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sales order:", error);
    return NextResponse.json(
      { error: "Failed to update sales order" },
      { status: 500 }
    );
  }
}
