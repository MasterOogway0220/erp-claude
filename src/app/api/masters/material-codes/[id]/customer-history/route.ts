import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { authorized, response, companyId } = await checkAccess("masters", "read");
  if (!authorized) return response!;

  const { id: materialCodeId } = await params;
  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 },
    );
  }

  try {
    const lastQuoteItem = await prisma.quotationItem.findFirst({
      where: {
        materialCodeId,
        // A soft-deleted quotation's price is not history.
        quotation: { customerId, deletedAt: null, ...companyFilter(companyId) },
      },
      orderBy: { quotation: { quotationDate: "desc" } },
      include: {
        quotation: {
          select: { quotationNo: true, quotationDate: true },
        },
      },
    });

    const lastPOItem = await prisma.clientPOItem.findFirst({
      where: {
        quotationItem: { materialCodeId },
        clientPurchaseOrder: { customerId, ...companyFilter(companyId) },
      },
      orderBy: { clientPurchaseOrder: { cpoDate: "desc" } },
      include: {
        clientPurchaseOrder: {
          select: { cpoNo: true, cpoDate: true },
        },
      },
    });

    return NextResponse.json({
      lastQuote: lastQuoteItem
        ? {
            rate: Number(lastQuoteItem.unitRate),
            quoteNo: lastQuoteItem.quotation.quotationNo,
            quotedAt: lastQuoteItem.quotation.quotationDate,
          }
        : null,
      lastPO: lastPOItem
        ? {
            rate: Number(lastPOItem.unitRate),
            poNo: lastPOItem.clientPurchaseOrder.cpoNo,
            orderedAt: lastPOItem.clientPurchaseOrder.cpoDate,
            remark: lastPOItem.rateRemark ?? lastPOItem.remark ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("customer-history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
