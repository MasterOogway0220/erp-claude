import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

// Valid invoice status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PARTIALLY_PAID", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "CANCELLED"],
  PAID: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sNo: "asc" },
        },
        paymentReceipts: {
          orderBy: { receiptDate: "desc" },
        },
        dispatchNote: {
          include: {
            packingList: {
              include: {
                items: true,
              },
            },
          },
        },
        salesOrder: {
          include: {
            items: true,
          },
        },
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
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
    const { authorized, session, response } = await checkAccess("invoice", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status } = body;

    // If status is being set, validate the transition
    if (status) {
      const existing = await prisma.invoice.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }

      const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: ${existing.status} -> ${status}. Allowed transitions: ${allowedTransitions.join(", ") || "none (terminal state)"}`,
          },
          { status: 400 }
        );
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
      },
      include: {
        customer: true,
        items: true,
        paymentReceipts: true,
      },
    });

    if (status) {
      createAuditLog({
        userId: session.user.id,
        action: "STATUS_CHANGE",
        tableName: "Invoice",
        recordId: id,
        fieldName: "status",
        oldValue: body._previousStatus || undefined,
        newValue: status,
      }).catch(console.error);
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
