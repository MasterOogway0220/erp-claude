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
  SENT: ["WON", "LOST", "EXPIRED"],
  EXPIRED: [], // Terminal for this revision; can create new revision
  LOST: [], // Can create new revision from LOST
  WON: [], // Terminal
  SUPERSEDED: [], // Terminal
  CANCELLED: [], // Terminal
  REVISED: [], // Legacy status - terminal
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("quotation", "read");
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
        paymentTerms: true,
        deliveryTerms: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Fetch full revision chain (all revisions with same quotationNo)
    const revisionChain = await prisma.quotation.findMany({
      where: { quotationNo: quotation.quotationNo },
      select: {
        id: true,
        quotationNo: true,
        version: true,
        quotationDate: true,
        status: true,
        revisionTrigger: true,
        grandTotal: true,
        preparedBy: { select: { name: true } },
        sentDate: true,
        changeSnapshot: true,
      },
      orderBy: { version: "asc" },
    });

    return NextResponse.json({ quotation, revisionChain });
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
    const { status, approvalRemarks, lossReason, lossCompetitor, lossNotes } = body;

    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { status: true, quotationNo: true, version: true },
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

    // Remarks are mandatory when rejecting
    if (status === "REJECTED" && !approvalRemarks) {
      return NextResponse.json(
        { error: "Remarks are required when rejecting a quotation" },
        { status: 400 }
      );
    }

    // Loss reason is mandatory when marking as LOST
    if (status === "LOST" && !lossReason) {
      return NextResponse.json(
        { error: "Loss reason is required when marking a quotation as lost" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;

    if (status === "APPROVED") {
      updateData.approvedById = session.user.id;
      updateData.approvalDate = new Date();
      updateData.approvalRemarks = approvalRemarks || null;
    }

    if (status === "REJECTED") {
      updateData.approvedById = session.user.id;
      updateData.approvalDate = new Date();
      updateData.approvalRemarks = approvalRemarks;
    }

    if (status === "LOST") {
      updateData.lossReason = lossReason;
      updateData.lossCompetitor = lossCompetitor || null;
      updateData.lossNotes = lossNotes || null;
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: true,
        terms: true,
      },
    });

    // Auto-supersede: When a revision is marked WON, supersede all others in the chain
    if (status === "WON") {
      await prisma.quotation.updateMany({
        where: {
          quotationNo: existing.quotationNo,
          id: { not: id },
          status: { in: ["SENT", "APPROVED", "EXPIRED", "REVISED"] },
        },
        data: { status: "SUPERSEDED" },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "Quotation",
      recordId: id,
      fieldName: "status",
      oldValue: existing.status,
      newValue: updated.status,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json(
      { error: "Failed to update quotation" },
      { status: 500 }
    );
  }
}
