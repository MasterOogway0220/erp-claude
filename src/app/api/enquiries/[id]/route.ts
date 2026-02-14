import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

// Valid enquiry status transitions
const VALID_ENQUIRY_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["QUOTATION_PREPARED", "WON", "LOST", "CANCELLED"],
  QUOTATION_PREPARED: ["WON", "LOST", "CANCELLED"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("enquiry", "read");
    if (!authorized) return response!;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sNo: "asc" } },
        quotations: {
          select: {
            id: true,
            quotationNo: true,
            quotationDate: true,
            status: true,
            version: true,
          },
        },
      },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ enquiry });
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    return NextResponse.json(
      { error: "Failed to fetch enquiry" },
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
    const { authorized, session, response } = await checkAccess("enquiry", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, lostReason } = body;

    // Prevent edits when quotations exist (except marking as Lost)
    const existing = await prisma.enquiry.findUnique({
      where: { id },
      include: { _count: { select: { quotations: true } } },
    });

    // Validate status transition
    if (existing && status) {
      const allowedTransitions = VALID_ENQUIRY_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existing.status} to ${status}` },
          { status: 400 }
        );
      }
    }

    if (existing && existing._count.quotations > 0 && status !== "LOST") {
      return NextResponse.json(
        { error: "Cannot modify enquiry with linked quotations (except marking as Lost)" },
        { status: 403 }
      );
    }

    const updateData: any = { status };
    if (status === "LOST" && lostReason) {
      updateData.lostReason = lostReason;
    }

    const updated = await prisma.enquiry.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return NextResponse.json(
      { error: "Failed to update enquiry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("enquiry", "delete");
    if (!authorized) return response!;

    // Look up the enquiry with quotation count
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: { _count: { select: { quotations: true } } },
    });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }
    if (enquiry.status !== "OPEN") {
      return NextResponse.json(
        { error: "Only OPEN enquiries can be deleted" },
        { status: 403 }
      );
    }
    if (enquiry._count.quotations > 0) {
      return NextResponse.json(
        { error: "Cannot delete enquiry with linked quotations" },
        { status: 403 }
      );
    }

    await prisma.enquiry.delete({
      where: { id },
    });

    // Audit log for deletion
    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "Enquiry",
      recordId: id,
      oldValue: JSON.stringify({
        enquiryNo: enquiry.enquiryNo,
        status: enquiry.status,
      }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    return NextResponse.json(
      { error: "Failed to delete enquiry" },
      { status: 500 }
    );
  }
}
