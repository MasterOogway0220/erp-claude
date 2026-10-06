import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("clientPO", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, contactPerson: true, currency: true, state: true, gstNo: true, customerType: true } },
        company: { select: { regState: true } },
        buyer: { select: { buyerName: true, email: true, mobile: true, telephone: true } },
        paymentTerms: { select: { name: true } },
        deliveryTerms: { select: { name: true } },
        // The offer terms, which a client PO copies and edits for the order.
        terms: { orderBy: { termNo: "asc" } },
        items: {
          include: {
            clientPOItems: {
              include: {
                clientPurchaseOrder: {
                  select: { id: true, cpoNo: true, status: true },
                },
              },
            },
          },
          orderBy: { sNo: "asc" },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Calculate balance for each item. A regretted line was never quoted, so
    // the customer cannot raise a PO against it — keep it out of the list.
    const itemsWithBalance = quotation.items.filter((item) => !item.isRegret).map((item) => {
      // Sum qty ordered across all non-cancelled Client POs for this item
      const totalOrdered = item.clientPOItems
        .filter((cpoItem) => cpoItem.clientPurchaseOrder.status !== "CANCELLED")
        .reduce((sum: number, cpoItem) => sum + Number(cpoItem.qtyOrdered), 0);

      const qtyQuoted = Number(item.quantity);
      const balanceQty = Math.max(0, qtyQuoted - totalOrdered);

      return {
        id: item.id,
        sNo: item.sNo,
        // The client's own serial for the line, as the quotation printed it.
        slNo: item.slNo,
        product: item.product,
        // A non-standard line's own description (its product is often just
        // "Non-Standard Item").
        itemDescription: item.itemDescription,
        material: item.material,
        additionalSpec: item.additionalSpec,
        sizeLabel: item.sizeLabel,
        od: item.od ? Number(item.od) : null,
        wt: item.wt ? Number(item.wt) : null,
        ends: item.ends,
        uom: item.uom,
        hsnCode: item.hsnCode,
        materialCodeId: item.materialCodeId ?? null,
        qtyQuoted,
        totalOrdered,
        balanceQty,
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
        delivery: item.delivery,
        remark: item.remark,
        // Previous CPOs against this item
        previousOrders: item.clientPOItems
          .filter((cpoItem) => cpoItem.clientPurchaseOrder.status !== "CANCELLED")
          .map((cpoItem) => ({
            cpoNo: cpoItem.clientPurchaseOrder.cpoNo,
            qtyOrdered: Number(cpoItem.qtyOrdered),
          })),
      };
    });

    return NextResponse.json({
      quotation: {
        id: quotation.id,
        quotationNo: quotation.quotationNo,
        customer: quotation.customer,
        // The customer's buyer the quotation was addressed to; phone as the
        // quotation prints it (mobile, else telephone).
        buyer: quotation.buyer
          ? {
              name: quotation.buyer.buyerName,
              email: quotation.buyer.email,
              phone: quotation.buyer.mobile || quotation.buyer.telephone || null,
            }
          : null,
        currency: quotation.currency,
        paymentTerms: quotation.paymentTerms?.name || null,
        deliveryTerms: quotation.deliveryTerms?.name || null,
        deliveryPeriod: quotation.deliveryPeriod,
        supplierState: quotation.company?.regState || null,
        clientState: quotation.customer.state || null,
        taxRate: quotation.taxRate ? Number(quotation.taxRate) : null,
        terms: quotation.terms.map((t) => ({
          termName: t.termName,
          termValue: t.termValue,
          isIncluded: t.isIncluded,
        })),
      },
      items: itemsWithBalance,
    });
  } catch (error) {
    console.error("Error fetching quotation balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation balance" },
      { status: 500 }
    );
  }
}
