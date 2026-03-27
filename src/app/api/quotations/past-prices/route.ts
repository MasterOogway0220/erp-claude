import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/quotations/past-prices?customerId=...
// Returns past quotations for a customer with their items
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId")?.trim();

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Fetch past quotations for this customer
    const quotations = await prisma.quotation.findMany({
      where: { customerId },
      select: {
        id: true,
        quotationNo: true,
        quotationDate: true,
        status: true,
        quotationCategory: true,
        items: {
          select: {
            id: true,
            product: true,
            material: true,
            additionalSpec: true,
            itemDescription: true,
            sizeLabel: true,
            schedule: true,
            unitRate: true,
            uom: true,
            quantity: true,
          },
        },
      },
      orderBy: { quotationDate: "desc" },
      take: 50,
    });

    // Format: list of quotations with their items
    const results = quotations.map((q) => ({
      id: q.id,
      quotationNo: q.quotationNo,
      quotationDate: q.quotationDate,
      status: q.status,
      quotationCategory: q.quotationCategory,
      itemCount: q.items.length,
      items: q.items.map((item) => ({
        id: item.id,
        product: item.product,
        material: item.material,
        additionalSpec: item.additionalSpec,
        itemDescription: item.itemDescription,
        sizeLabel: item.sizeLabel,
        schedule: item.schedule,
        unitRate: item.unitRate ? Number(item.unitRate) : null,
        uom: item.uom,
        quantity: item.quantity ? Number(item.quantity) : null,
      })),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Past prices error:", error);
    return NextResponse.json({ error: "Failed to fetch past prices" }, { status: 500 });
  }
}
