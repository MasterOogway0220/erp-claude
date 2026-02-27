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

/**
 * Valid PO Acceptance status transitions
 * PENDING can go to ACCEPTED, REJECTED, HOLD
 * HOLD can go back to ACCEPTED or REJECTED
 * ACCEPTED/REJECTED are final (cannot go back to PENDING)
 */
const VALID_PO_ACCEPTANCE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "HOLD"],
  HOLD: ["ACCEPTED", "REJECTED"],
  // ACCEPTED and REJECTED are terminal — no transitions allowed
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
      select: { status: true, poAcceptanceStatus: true, soNo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    // Enforce SO status transition rules
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

    // Enforce PO acceptance status transition rules
    if (poAcceptanceStatus) {
      const allowedTransitions = VALID_PO_ACCEPTANCE_TRANSITIONS[existing.poAcceptanceStatus];
      if (!allowedTransitions || !allowedTransitions.includes(poAcceptanceStatus)) {
        return NextResponse.json(
          {
            error: `Invalid PO acceptance transition. Cannot move from ${existing.poAcceptanceStatus} to ${poAcceptanceStatus}. ${
              !allowedTransitions
                ? `${existing.poAcceptanceStatus} is a final status.`
                : `Allowed: ${allowedTransitions.join(", ")}`
            }`,
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

    // Audit log for SO status change
    if (status) {
      createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        tableName: "SalesOrder",
        recordId: id,
        fieldName: "status",
        oldValue: existing.status,
        newValue: status,
      }).catch(console.error);
    }

    // Audit log for PO acceptance status change
    if (poAcceptanceStatus) {
      createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        tableName: "SalesOrder",
        recordId: id,
        fieldName: "poAcceptanceStatus",
        oldValue: existing.poAcceptanceStatus,
        newValue: poAcceptanceStatus,
      }).catch(console.error);
    }

    // Audit log for review remarks
    if (poReviewRemarks !== undefined) {
      createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        tableName: "SalesOrder",
        recordId: id,
        fieldName: "poReviewRemarks",
        newValue: poReviewRemarks || "(cleared)",
      }).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sales order:", error);
    return NextResponse.json(
      { error: "Failed to update sales order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true, soNo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    if (existing.status !== "OPEN") {
      return NextResponse.json(
        { error: `Cannot edit sales order with status ${existing.status}. Only OPEN orders can be edited.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerPoNo,
      customerPoDate,
      customerPoDocument,
      projectName,
      deliverySchedule,
      paymentTerms,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const qty = parseFloat(items[i].quantity);
      const rate = parseFloat(items[i].unitRate);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Quantity must be a positive number` },
          { status: 400 }
        );
      }
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Unit rate must be a positive number` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update SO header
      const so = await tx.salesOrder.update({
        where: { id },
        data: {
          customerPoNo: customerPoNo || null,
          customerPoDate: customerPoDate ? new Date(customerPoDate) : null,
          customerPoDocument: customerPoDocument || null,
          projectName: projectName || null,
          deliverySchedule: deliverySchedule || null,
          paymentTerms: paymentTerms || null,
        },
      });

      // Delete existing items and recreate
      await tx.salesOrderItem.deleteMany({
        where: {
          salesOrderId: id,
          // Only delete items that have no dispatched reservations
          stockReservations: {
            none: { status: "DISPATCHED" },
          },
        },
      });

      // Check if any items with DISPATCHED reservations remain
      const remainingItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: id },
        select: { id: true },
      });

      if (remainingItems.length > 0) {
        // Some items couldn't be deleted — append new items after existing
        const startSNo = remainingItems.length + 1;
        await tx.salesOrderItem.createMany({
          data: items.map((item: any, index: number) => ({
            salesOrderId: id,
            sNo: startSNo + index,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.quantity) * parseFloat(item.unitRate),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          })),
        });
      } else {
        // All items deleted, create fresh
        await tx.salesOrderItem.createMany({
          data: items.map((item: any, index: number) => ({
            salesOrderId: id,
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.quantity) * parseFloat(item.unitRate),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          })),
        });
      }

      return so;
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "SalesOrder",
      recordId: id,
      fieldName: "items",
      newValue: `Updated ${items.length} items`,
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
