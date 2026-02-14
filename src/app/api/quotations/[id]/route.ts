import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

// Valid quotation status transitions
const VALID_QUOTATION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  REJECTED: ["DRAFT"],
  APPROVED: ["SENT"],
  SENT: ["WON", "LOST"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: true,
        buyer: true,
        preparedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
        parentQuotation: {
          select: {
            id: true,
            quotationNo: true,
            version: true,
            quotationDate: true,
            status: true,
          },
        },
        childQuotations: {
          select: {
            id: true,
            quotationNo: true,
            version: true,
            quotationDate: true,
            status: true,
          },
          orderBy: { version: "asc" },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({ quotation });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation" },
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
    const { authorized, session, response } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, approvalRemarks } = body;

    // Fetch existing quotation to validate transition
    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Validate status transition
    if (status) {
      const allowedTransitions = VALID_QUOTATION_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existing.status} to ${status}` },
          { status: 400 }
        );
      }
    }

    // Only MANAGEMENT or ADMIN can approve/reject quotations
    if (status === "APPROVED" || status === "REJECTED") {
      const { authorized: canApprove, response: approveResponse } = await checkAccess("quotation", "approve");
      if (!canApprove) return approveResponse!;
    }

    // Remarks are mandatory when rejecting a quotation
    if (status === "REJECTED" && !approvalRemarks) {
      return NextResponse.json(
        { error: "Remarks are required when rejecting a quotation" },
        { status: 400 }
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status,
        ...(status === "APPROVED" && {
          approvedById: session.user.id,
          approvalDate: new Date(),
          approvalRemarks,
        }),
        ...(status === "REJECTED" && {
          approvedById: session.user.id,
          approvalDate: new Date(),
          approvalRemarks,
        }),
      },
      include: {
        customer: true,
        items: true,
        terms: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "Quotation",
      recordId: id,
      fieldName: "status",
      oldValue: existing?.status || undefined,
      newValue: updated.status,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json(
      { error: "Failed to update quotation" },
      { status: 500 }
    );
  }
}
