import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        quotation: { customerId },
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
        clientPurchaseOrder: { customerId },
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
