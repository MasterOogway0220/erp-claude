import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

// Allowed statuses from which a revision can be created (RC-01, RC-08, RC-09)
const REVISABLE_STATUSES = ["APPROVED", "SENT", "REJECTED", "EXPIRED", "LOST"];

// Statuses that indicate an active draft exists in the chain (RC-03)
const ACTIVE_DRAFT_STATUSES = ["DRAFT", "PENDING_APPROVAL"];

// Max revisions per chain (RC-04)
const MAX_REVISIONS = 99;

// Revision trigger codes
const VALID_TRIGGERS = [
  "PRICE_NEGOTIATION",
  "SPEC_CHANGE",
  "QTY_CHANGE",
  "ITEM_ADD",
  "ITEM_REMOVE",
  "VALIDITY_EXTENSION",
  "DELIVERY_CHANGE",
  "TERMS_CHANGE",
  "SCOPE_CHANGE",
  "FOREX_CHANGE",
  "VENDOR_COST_CHANGE",
  "MARKET_ADJUSTMENT",
  "COMPETITIVE_RESPONSE",
  "REGULATORY_CHANGE",
  "CUSTOMER_PO_MISMATCH",
  "INTERNAL_CORRECTION",
  "RE_QUOTATION_AFTER_EXPIRY",
  "OTHER",
];

function decimalToNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  return Number(val);
}

function isDecimalLike(val: any): boolean {
  return val !== null && val !== undefined && typeof val === "object" && typeof val.toNumber === "function";
}

/**
 * Compute a change snapshot comparing two quotation revisions.
 * Used for instant comparison without runtime diffing.
 */
function computeChangeSnapshot(
  original: { items: any[]; terms: any[]; validUpto: Date | null; currency: string; subtotal: any; grandTotal: any; deliveryPeriod: string | null; paymentTermsId: string | null; deliveryTermsId: string | null },
  newItems: any[],
  newTerms: any[],
  newData: { validUpto?: Date | null; currency?: string; deliveryPeriod?: string | null; paymentTermsId?: string | null; deliveryTermsId?: string | null },
  previousVersion: number,
  currentVersion: number
): Record<string, any> {
  // Header changes
  const headerChanges: Record<string, { old: any; new: any }> = {};

  if (newData.validUpto?.toISOString() !== original.validUpto?.toISOString()) {
    headerChanges.validUpto = { old: original.validUpto, new: newData.validUpto };
  }
  if (newData.currency && newData.currency !== original.currency) {
    headerChanges.currency = { old: original.currency, new: newData.currency };
  }
  if (newData.deliveryPeriod !== undefined && newData.deliveryPeriod !== original.deliveryPeriod) {
    headerChanges.deliveryPeriod = { old: original.deliveryPeriod, new: newData.deliveryPeriod };
  }
  if (newData.paymentTermsId !== undefined && newData.paymentTermsId !== original.paymentTermsId) {
    headerChanges.paymentTermsId = { old: original.paymentTermsId, new: newData.paymentTermsId };
  }
  if (newData.deliveryTermsId !== undefined && newData.deliveryTermsId !== original.deliveryTermsId) {
    headerChanges.deliveryTermsId = { old: original.deliveryTermsId, new: newData.deliveryTermsId };
  }

  // Item changes - match by sNo
  const origItemMap = new Map(original.items.map((i) => [i.sNo, i]));
  const newItemMap = new Map(newItems.map((i: any) => [i.sNo, i]));

  const itemsAdded: any[] = [];
  const itemsRemoved: any[] = [];
  const itemsModified: any[] = [];

  // Check for new/modified items
  for (const [sNo, newItem] of newItemMap) {
    const origItem = origItemMap.get(sNo);
    if (!origItem) {
      itemsAdded.push({ sNo, product: newItem.product, quantity: decimalToNumber(newItem.quantity) });
    } else {
      const changes: Record<string, { old: any; new: any }> = {};
      const compareFields = ["quantity", "unitRate", "amount", "product", "material", "sizeLabel", "od", "wt", "length", "ends"];
      for (const field of compareFields) {
        const origVal = origItem[field];
        const newVal = newItem[field];
        const origNum = isDecimalLike(origVal) ? Number(origVal) : origVal;
        const newNum = isDecimalLike(newVal) ? Number(newVal) : newVal;
        if (origNum !== newNum && String(origNum) !== String(newNum)) {
          changes[field] = { old: origNum, new: newNum };
        }
      }
      if (Object.keys(changes).length > 0) {
        itemsModified.push({ sNo, changes });
      }
    }
  }

  // Check for removed items
  for (const [sNo, origItem] of origItemMap) {
    if (!newItemMap.has(sNo)) {
      itemsRemoved.push({ sNo, product: origItem.product, quantity: decimalToNumber(origItem.quantity) });
    }
  }

  // Terms changes
  const termsChanges: any[] = [];
  const origTermMap = new Map(original.terms.map((t) => [t.termName, t.termValue]));
  for (const newTerm of newTerms) {
    const origVal = origTermMap.get(newTerm.termName);
    if (origVal !== newTerm.termValue) {
      termsChanges.push({ termName: newTerm.termName, old: origVal || null, new: newTerm.termValue });
    }
  }

  // Summary
  const origTotal = decimalToNumber(original.grandTotal) || 0;
  const newTotal = newItems.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
  const totalChange = newTotal - origTotal;

  return {
    previousRevision: previousVersion,
    currentRevision: currentVersion,
    headerChanges,
    itemsAdded,
    itemsRemoved,
    itemsModified,
    termsChanges,
    summary: {
      totalChange: Math.round(totalChange * 100) / 100,
      totalChangePercent: origTotal > 0 ? Math.round((totalChange / origTotal) * 10000) / 100 : 0,
      itemCountChange: newItems.length - original.items.length,
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      revisionTrigger,
      revisionSubReason,
      revisionNotes,
      customerReference,
      sourceRevisionId, // Optional: copy from a specific revision instead of this one
    } = body;

    // RC-06: Revision trigger is mandatory
    if (!revisionTrigger || !VALID_TRIGGERS.includes(revisionTrigger)) {
      return NextResponse.json(
        { error: "A valid revision trigger (reason) is required" },
        { status: 400 }
      );
    }

    // "Other" trigger requires sub-reason
    if (revisionTrigger === "OTHER" && !revisionSubReason) {
      return NextResponse.json(
        { error: "Sub-reason is required when trigger is 'Other'" },
        { status: 400 }
      );
    }

    // Fetch the quotation to be revised
    const original = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // RC-01: Only allow revision from specific statuses
    if (!REVISABLE_STATUSES.includes(original.status)) {
      return NextResponse.json(
        { error: `Cannot revise a quotation with status ${original.status}. Allowed: ${REVISABLE_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // RC-02: Cannot revise a WON quotation (already has SO)
    // RC-07: Cannot revise a CANCELLED quotation
    // (These are already excluded by REVISABLE_STATUSES check above)

    // Find all revisions in the chain (same quotationNo)
    const chainRevisions = await prisma.quotation.findMany({
      where: { quotationNo: original.quotationNo },
      select: { id: true, version: true, status: true },
      orderBy: { version: "asc" },
    });

    // RC-03: Block if a DRAFT or PENDING_APPROVAL revision already exists in the chain
    const activeDraft = chainRevisions.find((r) =>
      ACTIVE_DRAFT_STATUSES.includes(r.status) && r.id !== id
    );
    if (activeDraft) {
      return NextResponse.json(
        { error: "Cannot create a new revision: a draft or pending approval revision already exists in this chain" },
        { status: 400 }
      );
    }

    // RC-04: Max revisions per chain
    const maxVersion = Math.max(...chainRevisions.map((r) => r.version));
    if (maxVersion >= MAX_REVISIONS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REVISIONS} revisions reached for this quotation` },
        { status: 400 }
      );
    }

    // Determine which revision to copy from
    let sourceQuotation = original;
    if (sourceRevisionId && sourceRevisionId !== id) {
      const source = await prisma.quotation.findUnique({
        where: { id: sourceRevisionId },
        include: {
          items: { orderBy: { sNo: "asc" } },
          terms: { orderBy: { termNo: "asc" } },
        },
      });
      if (!source || source.quotationNo !== original.quotationNo) {
        return NextResponse.json(
          { error: "Source revision not found or not in the same quotation chain" },
          { status: 400 }
        );
      }
      sourceQuotation = source;
    }

    const newVersion = maxVersion + 1;

    // Compute change snapshot from the source revision
    const changeSnapshot = computeChangeSnapshot(
      sourceQuotation,
      sourceQuotation.items, // Initially same items (user edits in draft later)
      sourceQuotation.terms,
      {
        validUpto: sourceQuotation.validUpto,
        currency: sourceQuotation.currency,
        deliveryPeriod: sourceQuotation.deliveryPeriod,
        paymentTermsId: sourceQuotation.paymentTermsId,
        deliveryTermsId: sourceQuotation.deliveryTermsId,
      },
      sourceQuotation.version,
      newVersion
    );

    // Create the new revision in a transaction
    const newQuotation = await prisma.$transaction(async (tx) => {
      // Create new revision with SAME quotationNo and incremented version
      const created = await tx.quotation.create({
        data: {
          quotationNo: original.quotationNo, // FE-12: Same quotation number
          quotationDate: new Date(),
          enquiryId: original.enquiryId, // FE-02: Cannot change
          customerId: original.customerId, // FE-01: Cannot change
          quotationType: original.quotationType, // FE-03: Cannot change
          quotationCategory: original.quotationCategory, // FE-04: Cannot change
          status: "DRAFT",
          version: newVersion,
          parentQuotationId: sourceQuotation.id,
          validUpto: sourceQuotation.validUpto,
          currency: sourceQuotation.currency,
          paymentTermsId: sourceQuotation.paymentTermsId,
          deliveryTermsId: sourceQuotation.deliveryTermsId,
          deliveryPeriod: sourceQuotation.deliveryPeriod,
          preparedById: session.user.id,
          buyerId: sourceQuotation.buyerId,
          preparedByEmployeeId: sourceQuotation.preparedByEmployeeId,
          subtotal: sourceQuotation.subtotal,
          taxRate: sourceQuotation.taxRate,
          taxAmount: sourceQuotation.taxAmount,
          grandTotal: sourceQuotation.grandTotal,
          amountInWords: sourceQuotation.amountInWords,
          // Revision-specific fields
          revisionTrigger,
          revisionSubReason: revisionSubReason || null,
          revisionNotes: revisionNotes || null,
          customerReference: customerReference || null,
          changeSnapshot,
          // Copy items
          items: {
            create: sourceQuotation.items.map((item) => ({
              sNo: item.sNo,
              product: item.product,
              material: item.material,
              additionalSpec: item.additionalSpec,
              sizeId: item.sizeId,
              sizeLabel: item.sizeLabel,
              od: item.od,
              wt: item.wt,
              length: item.length,
              ends: item.ends,
              quantity: item.quantity,
              materialCost: item.materialCost,
              logisticsCost: item.logisticsCost,
              inspectionCost: item.inspectionCost,
              otherCosts: item.otherCosts,
              totalCostPerUnit: item.totalCostPerUnit,
              marginPercentage: item.marginPercentage,
              unitRate: item.unitRate,
              amount: item.amount,
              delivery: item.delivery,
              remark: item.remark,
              unitWeight: item.unitWeight,
              totalWeightMT: item.totalWeightMT,
              tagNo: item.tagNo,
              drawingRef: item.drawingRef,
              itemDescription: item.itemDescription,
              certificateReq: item.certificateReq,
              itemType: item.itemType,
              wtType: item.wtType,
              tubeLength: item.tubeLength,
              tubeCount: item.tubeCount,
              componentPosition: item.componentPosition,
              sizeNPS: item.sizeNPS,
              schedule: item.schedule,
              materialCodeId: item.materialCodeId,
              uom: item.uom,
              hsnCode: item.hsnCode,
              taxRate: item.taxRate,
            })),
          },
          // Copy terms
          terms: {
            create: sourceQuotation.terms.map((term) => ({
              termNo: term.termNo,
              termName: term.termName,
              termValue: term.termValue,
              isDefault: term.isDefault,
              isIncluded: term.isIncluded,
              isCustom: term.isCustom,
              isHeadingEditable: term.isHeadingEditable,
            })),
          },
        },
        include: {
          customer: true,
          items: { orderBy: { sNo: "asc" } },
          terms: { orderBy: { termNo: "asc" } },
        },
      });

      return created;
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "Quotation",
      recordId: newQuotation.id,
      newValue: JSON.stringify({
        quotationNo: newQuotation.quotationNo,
        version: newQuotation.version,
        revisionTrigger,
        parentRevisionId: sourceQuotation.id,
      }),
    });

    return NextResponse.json({ quotation: newQuotation });
  } catch (error) {
    console.error("Error creating quotation revision:", error);
    return NextResponse.json(
      { error: "Failed to create quotation revision" },
      { status: 500 }
    );
  }
}
