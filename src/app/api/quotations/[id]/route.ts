import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { numberToWords } from "@/lib/amount-in-words";
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

// DELETE — Delete DRAFT quotation only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "delete");
    if (!authorized) return response!;

    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { status: true, quotationNo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT quotations can be deleted" },
        { status: 400 }
      );
    }

    // Delete items and terms first, then the quotation
    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotationTerm.deleteMany({ where: { quotationId: id } });
      await tx.quotation.delete({ where: { id } });
    });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "Quotation",
      recordId: id,
      oldValue: existing.quotationNo,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json(
      { error: "Failed to delete quotation" },
      { status: 500 }
    );
  }
}

// PUT — Full edit of DRAFT quotation (items, terms, header fields)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { status: true, quotationNo: true, customerId: true, quotationType: true, quotationCategory: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT quotations can be edited. Use revision for approved/sent quotations." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      currency,
      validUpto,
      buyerId,
      paymentTermsId,
      deliveryTermsId,
      deliveryPeriod,
      taxRate,
      items,
      terms,
      quotationDate,
      inquiryNo,
      inquiryDate,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
      0
    );
    const parsedTaxRate = taxRate ? parseFloat(taxRate) : 0;
    const taxAmount = parsedTaxRate > 0 ? subtotal * parsedTaxRate / 100 : 0;
    const grandTotal = subtotal + taxAmount;
    const effectiveCurrency = currency || "INR";
    const computedAmountInWords = numberToWords(grandTotal, effectiveCurrency);

    // Transaction: update header, delete old items/terms, create new ones
    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items and terms
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotationTerm.deleteMany({ where: { quotationId: id } });

      // Update quotation header and recreate items/terms
      return tx.quotation.update({
        where: { id },
        data: {
          currency: effectiveCurrency,
          ...(quotationDate ? { quotationDate: new Date(quotationDate) } : {}),
          validUpto: validUpto ? new Date(validUpto) : null,
          buyerId: buyerId || null,
          inquiryNo: inquiryNo || null,
          inquiryDate: inquiryDate ? new Date(inquiryDate) : null,
          paymentTermsId: paymentTermsId || null,
          deliveryTermsId: deliveryTermsId || null,
          deliveryPeriod: deliveryPeriod || null,
          subtotal,
          taxRate: parsedTaxRate || null,
          taxAmount: taxAmount || null,
          grandTotal,
          amountInWords: computedAmountInWords,
          items: {
            create: items.map((item: any, index: number) => ({
              sNo: index + 1,
              product: item.product || null,
              material: item.material || null,
              additionalSpec: item.additionalSpec || null,
              sizeId: item.sizeId || null,
              sizeLabel: item.sizeLabel || null,
              sizeNPS: item.nps ? parseFloat(item.nps) : (item.sizeNPS ? parseFloat(item.sizeNPS) : null),
              schedule: item.schedule || null,
              od: item.od ? parseFloat(item.od) : null,
              wt: item.wt ? parseFloat(item.wt) : null,
              length: item.length || null,
              ends: item.ends || null,
              quantity: parseFloat(item.quantity),
              unitRate: parseFloat(item.unitRate),
              amount: parseFloat(item.amount),
              delivery: item.delivery || null,
              remark: item.remark || null,
              materialCodeId: item.materialCodeId || null,
              uom: item.uom || null,
              hsnCode: item.hsnCode || null,
              taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
              unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
              totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
              materialCost: item.materialCost ? parseFloat(item.materialCost) : null,
              logisticsCost: item.logisticsCost ? parseFloat(item.logisticsCost) : null,
              inspectionCost: item.inspectionCost ? parseFloat(item.inspectionCost) : null,
              otherCosts: item.otherCosts ? parseFloat(item.otherCosts) : null,
              totalCostPerUnit: item.totalCostPerUnit ? parseFloat(item.totalCostPerUnit) : null,
              marginPercentage: item.marginPercentage ? parseFloat(item.marginPercentage) : null,
              tagNo: item.tagNo || null,
              drawingRef: item.drawingRef || null,
              itemDescription: item.itemDescription || null,
              certificateReq: item.certificateReq || null,
              itemType: item.itemType || null,
              wtType: item.wtType || null,
              tubeLength: item.tubeLength || null,
              tubeCount: item.tubeCount ? parseInt(item.tubeCount) : null,
              componentPosition: item.componentPosition || null,
            })),
          },
          terms: {
            create: terms?.map((term: any, index: number) => ({
              termNo: index + 1,
              termName: term.termName,
              termValue: term.termValue,
              isDefault: term.isDefault ?? !term.isCustom,
              isIncluded: term.isIncluded ?? true,
              isCustom: term.isCustom ?? false,
              isHeadingEditable: term.isHeadingEditable ?? false,
            })) || [],
          },
        },
        include: {
          customer: true,
          items: { orderBy: { sNo: "asc" } },
          terms: { orderBy: { termNo: "asc" } },
        },
      });
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "Quotation",
      recordId: id,
      newValue: JSON.stringify({ quotationNo: existing.quotationNo, itemCount: items.length }),
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error editing draft quotation:", error);
    return NextResponse.json(
      { error: "Failed to edit quotation" },
      { status: 500 }
    );
  }
}
