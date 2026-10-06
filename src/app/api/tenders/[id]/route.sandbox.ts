import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { tenderItemRows } from "@/lib/tenders/items";
import { tenderTermRows } from "@/lib/quotations/terms";
import { softDeleteData } from "@/lib/soft-delete";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const tender = await prisma.tender.findFirst({
      where: { id, ...companyFilter(companyId), deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, city: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
        documents: {
          orderBy: { uploadedAt: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
        quotations: {
          where: { deletedAt: null },
          select: { id: true, quotationNo: true, quotationDate: true, status: true, quotationCategory: true },
          orderBy: { quotationDate: "desc" },
        },
        salesOrders: {
          select: { id: true, soNo: true, soDate: true, status: true },
          orderBy: { soDate: "desc" },
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

    const existing = await prisma.tender.findFirst({ where: { id, ...companyFilter(companyId), deletedAt: null } });
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

    // `items` (when sent) replaces every BOQ line — the edit screen sends the
    // whole grid. `terms` likewise; the detail page's status-only PATCH sends
    // neither, so it leaves both alone. Callback-form transaction: the sandbox
    // router rejects the array form for every user.
    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.items)) {
        await tx.tenderItem.deleteMany({ where: { tenderId: id } });
        const rows = tenderItemRows(body.items);
        if (rows.length) {
          await tx.tenderItem.createMany({ data: rows.map((r) => ({ ...r, tenderId: id })) });
        }
      }
      if (Array.isArray(body.terms)) {
        await tx.tenderTerm.deleteMany({ where: { tenderId: id } });
        const termRows = tenderTermRows(body.terms);
        if (termRows.length) {
          await tx.tenderTerm.createMany({ data: termRows.map((r) => ({ ...r, tenderId: id })) });
        }
      }
      return tx.tender.update({ where: { id }, data: updateData });
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

// Soft delete: sets deletedAt; every tender read filters it out. Refused once
// a quotation or sales order has been raised from the tender, because those
// documents link back to it.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("tender", "delete");
    if (!authorized) return response!;

    const { id } = await params;
    const existing = await prisma.tender.findFirst({
      where: { id, ...companyFilter(companyId), deletedAt: null },
      // A soft-deleted quotation no longer links to the tender.
      select: { tenderNo: true, _count: { select: { quotations: { where: { deletedAt: null } }, salesOrders: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }
    if (existing._count.quotations > 0 || existing._count.salesOrders > 0) {
      return NextResponse.json(
        { error: "This tender has quotations or sales orders raised from it and cannot be deleted" },
        { status: 409 }
      );
    }

    await prisma.tender.update({ where: { id }, data: softDeleteData() });

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "DELETE",
      tableName: "Tender",
      recordId: id,
      oldValue: existing.tenderNo,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tender:", error);
    return NextResponse.json({ error: "Failed to delete tender" }, { status: 500 });
  }
}
