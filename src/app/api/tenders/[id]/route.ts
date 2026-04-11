import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const tender = await prisma.tender.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, city: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        documents: {
          orderBy: { uploadedAt: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...tender,
      estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : null,
      emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
      items: tender.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        estimatedRate: item.estimatedRate ? Number(item.estimatedRate) : null,
        amount: item.amount ? Number(item.amount) : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching tender:", error);
    return NextResponse.json({ error: "Failed to fetch tender" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.tender.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    // Valid status transitions
    const validTransitions: Record<string, string[]> = {
      IDENTIFIED: ["DOCUMENT_PURCHASED", "NO_BID"],
      DOCUMENT_PURCHASED: ["BID_PREPARATION", "NO_BID"],
      BID_PREPARATION: ["SUBMITTED", "NO_BID"],
      SUBMITTED: ["OPENED"],
      OPENED: ["WON", "LOST"],
    };

    if (body.status && body.status !== existing.status) {
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${body.status}` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (body.tenderSource !== undefined) updateData.tenderSource = body.tenderSource || null;
    if (body.tenderRef !== undefined) updateData.tenderRef = body.tenderRef || null;
    if (body.organization !== undefined) updateData.organization = body.organization || null;
    if (body.projectName !== undefined) updateData.projectName = body.projectName || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.closingDate !== undefined) updateData.closingDate = body.closingDate ? new Date(body.closingDate) : null;
    if (body.openingDate !== undefined) updateData.openingDate = body.openingDate ? new Date(body.openingDate) : null;
    if (body.estimatedValue !== undefined) updateData.estimatedValue = body.estimatedValue ? parseFloat(body.estimatedValue) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.emdRequired !== undefined) updateData.emdRequired = body.emdRequired;
    if (body.emdAmount !== undefined) updateData.emdAmount = body.emdAmount ? parseFloat(body.emdAmount) : null;
    if (body.emdType !== undefined) updateData.emdType = body.emdType || null;
    if (body.emdSubmitted !== undefined) updateData.emdSubmitted = body.emdSubmitted;
    if (body.emdReturnDate !== undefined) updateData.emdReturnDate = body.emdReturnDate ? new Date(body.emdReturnDate) : null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.status) updateData.status = body.status;

    const updated = await prisma.tender.update({
      where: { id },
      data: updateData,
    });

    if (body.status && body.status !== existing.status) {
      createAuditLog({
        companyId,
        userId: session.user.id,
        action: "STATUS_CHANGE",
        tableName: "Tender",
        recordId: id,
        fieldName: "status",
        oldValue: existing.status,
        newValue: body.status,
      }).catch(console.error);
    }

    return NextResponse.json({
      ...updated,
      estimatedValue: updated.estimatedValue ? Number(updated.estimatedValue) : null,
      emdAmount: updated.emdAmount ? Number(updated.emdAmount) : null,
    });
  } catch (error) {
    console.error("Error updating tender:", error);
    return NextResponse.json({ error: "Failed to update tender" }, { status: 500 });
  }
}
