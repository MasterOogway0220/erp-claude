import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const quotations = await prisma.quotation.findMany({
      where: { customerId: id },
      include: {
        buyer: { select: { id: true, buyerName: true } },
        items: {
          select: {
            product: true,
            material: true,
            sizeLabel: true,
            quantity: true,
            unitRate: true,
            amount: true,
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { quotationDate: "desc" },
      take: 50,
    });

    const history = quotations.map((q) => ({
      id: q.id,
      quotationNo: q.quotationNo,
      quotationDate: q.quotationDate,
      status: q.status,
      quotationCategory: q.quotationCategory,
      quotationType: q.quotationType,
      currency: q.currency,
      buyerName: q.buyer?.buyerName || null,
      itemCount: q._count.items,
      totalValue: q.items.reduce((sum, item) => sum + Number(item.amount), 0),
      itemsSummary: q.items.slice(0, 3).map((item) => ({
        product: item.product,
        material: item.material,
        sizeLabel: item.sizeLabel,
      })),
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching quotation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation history" },
      { status: 500 }
    );
  }
}
