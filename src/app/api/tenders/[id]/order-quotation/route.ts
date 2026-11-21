import { NextRequest, NextResponse } from "next/server";
import { Prisma, QuotationCategory, QuotationStatus, QuotationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { numberToWords } from "@/lib/amount-in-words";
import { normalizeItemPricing } from "@/lib/quotations/pricing";
import { quotationItemRows } from "@/lib/quotations/item-rows";
import { tenderItemRows } from "@/lib/tenders/items";
import {
  isOrderableTender,
  pickOrderQuotation,
  quotationItemsFromTender,
  tenderMatchesCustomer,
} from "@/lib/tenders/order-quotation";

// POST /api/tenders/[id]/order-quotation   body: { customerId, items? }
// `items` (standard item editor lines) is used only when the tender has no
// lines of its own: they become the order quotation's lines and the tender's.
// Returns { quotationId } — the quotation a client PO on this tender is
// registered against. Reuses the newest quotation raised from the tender that
// the client was given; otherwise builds one from the tender (its number,
// lines, rates, currency and terms), status APPROVED because the tender
// itself was what we gave the client. See src/lib/tenders/order-quotation.ts.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, session, response, companyId } = await checkAccess("clientPO", "write");
  if (!authorized) return response!;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const customerId = typeof body?.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    const [tender, customer] = await Promise.all([
      prisma.tender.findFirst({
        where: { id, ...companyFilter(companyId), deletedAt: null },
        include: {
          items: true,
          terms: { orderBy: { termNo: "asc" } },
          quotations: {
            where: { deletedAt: null },
            select: { id: true, quotationNo: true, customerId: true, status: true, version: true, quotationDate: true },
          },
        },
      }),
      prisma.customerMaster.findFirst({
        where: { id: customerId, ...companyFilter(companyId) },
        select: { id: true, name: true, isActive: true, customerType: true },
      }),
    ]);
    if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    if (!customer) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (!tenderMatchesCustomer(tender, customer)) {
      return NextResponse.json(
        { error: `Tender ${tender.tenderNo} is not for ${customer.name}.` },
        { status: 400 }
      );
    }
    if (!isOrderableTender(tender.status)) {
      return NextResponse.json(
        { error: `Tender ${tender.tenderNo} is ${tender.status}; a PO cannot be registered against it.` },
        { status: 400 }
      );
    }

    const { use, blockedBy } = pickOrderQuotation(tender.quotations);
    if (use) {
      // The PO must be for the same client record as its quotation.
      if (use.customerId !== customer.id) {
        return NextResponse.json(
          { error: `Tender ${tender.tenderNo} was already ordered under quotation ${use.quotationNo} for another client record. Register the PO under that client.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ quotationId: use.id, created: false });
    }
    if (blockedBy) {
      return NextResponse.json(
        {
          error: `Quotation ${blockedBy.quotationNo} raised from tender ${tender.tenderNo} is still ${blockedBy.status === "DRAFT" ? "a draft" : "pending approval"}. Approve it, then register the PO against it.`,
        },
        { status: 409 }
      );
    }
    if (!customer.isActive) {
      return NextResponse.json(
        { error: `Client "${customer.name}" is deactivated. Reactivate the client to register a PO.` },
        { status: 400 }
      );
    }
    // A tender quotation logged without lines gets them typed in on the PO
    // screen (the same item editor a standard quotation uses). Those lines
    // become the order quotation's lines and are also written to the tender,
    // so the tender shows what was quoted and later POs find them.
    const typedItems: Record<string, unknown>[] = Array.isArray(body?.items) ? body.items : [];
    const fromTypedItems = tender.items.length === 0;
    if (fromTypedItems) {
      if (typedItems.length === 0) {
        return NextResponse.json(
          { error: `Tender ${tender.tenderNo} has no item lines. Add the items first.` },
          { status: 400 }
        );
      }
      for (let i = 0; i < typedItems.length; i++) {
        const itemError = normalizeItemPricing(typedItems[i]);
        if (itemError) {
          return NextResponse.json({ error: `Item ${i + 1}: ${itemError}` }, { status: 400 });
        }
      }
    }

    const items = fromTypedItems ? quotationItemRows(typedItems) : quotationItemsFromTender(tender.items);
    const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const userInDb = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });

    try {
      const quotation = await prisma.$transaction(async (tx) => {
        if (fromTypedItems) {
          await tx.tenderItem.createMany({
            data: tenderItemRows(
              typedItems.map((it) => ({ ...it, estimatedRate: it.unitRate, remarks: it.remark }))
            ).map((row) => ({ ...row, tenderId: tender.id })),
          });
        }
        return tx.quotation.create({
          data: {
            companyId,
            // Tenders share the quotation number series, so the tender's own
            // number is free for its order quotation and is what the client
            // knows the offer by.
            quotationNo: tender.tenderNo,
            version: 0,
            customerId: customer.id,
            quotationType: customer.customerType === "INTERNATIONAL" ? QuotationType.EXPORT : QuotationType.DOMESTIC,
            quotationCategory: QuotationCategory.STANDARD,
            status: QuotationStatus.APPROVED,
            currency: tender.currency || "INR",
            quotationDate: tender.tenderDate,
            inquiryNo: tender.tenderRef || null,
            kindAttention: tender.projectName || null,
            remarks: `Order quotation for tender ${tender.tenderNo}, made when a client PO was registered against it.`,
            subtotal,
            grandTotal: subtotal,
            amountInWords: numberToWords(subtotal, tender.currency || "INR"),
            preparedById: userInDb ? session.user.id : null,
            sourceTenderId: tender.id,
            items: { create: items },
            terms: {
              create: tender.terms.map((t, i) => ({
                termNo: i + 1,
                termName: t.termName,
                termValue: t.termValue,
                isDefault: !t.isCustom,
                isIncluded: t.isIncluded,
                isCustom: t.isCustom,
                isHeadingEditable: t.isCustom,
              })),
            },
          },
          select: { id: true },
        });
      });

      createAuditLog({
        companyId,
        userId: session.user.id,
        action: "CREATE",
        tableName: "Quotation",
        recordId: quotation.id,
        newValue: JSON.stringify({
          quotationNo: tender.tenderNo,
          sourceTenderId: tender.id,
          reason: "client PO on tender",
          ...(fromTypedItems ? { linesTypedOnPo: items.length } : {}),
        }),
      }).catch(console.error);

      return NextResponse.json({ quotationId: quotation.id, created: true });
    } catch (e) {
      // Two people registering a PO on the same tender at once: the second
      // create hits the (quotationNo, version) unique key — use the first one.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const existing = await prisma.quotation.findFirst({
          where: { sourceTenderId: tender.id, quotationNo: tender.tenderNo, version: 0, deletedAt: null },
          select: { id: true },
        });
        if (existing) return NextResponse.json({ quotationId: existing.id, created: false });
      }
      throw e;
    }
  } catch (error) {
    console.error("Tender order quotation error:", error);
    return NextResponse.json({ error: "Failed to prepare the tender for a PO" }, { status: 500 });
  }
}
