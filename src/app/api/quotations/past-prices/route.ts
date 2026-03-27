import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/quotations/past-prices?product=...&material=...
// Returns past quotation items matching product, with customer name and quote number
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get("product")?.trim();
    const material = searchParams.get("material")?.trim();
    const itemDescription = searchParams.get("itemDescription")?.trim();

    if (!product && !itemDescription) {
      return NextResponse.json({ error: "Product or item description is required" }, { status: 400 });
    }

    // Build filter: match product or itemDescription, optionally material
    // No company filter — past prices are fetched across all companies by product
    const where: any = {};

    if (product) {
      where.product = { equals: product };
    } else if (itemDescription) {
      where.itemDescription = { contains: itemDescription };
    }

    if (material) {
      where.material = { equals: material };
    }

    const items = await prisma.quotationItem.findMany({
      where,
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
        quotation: {
          select: {
            quotationNo: true,
            quotationDate: true,
            status: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        quotation: {
          quotationDate: "desc",
        },
      },
      take: 50,
    });

    // Format response
    const results = items.map((item) => ({
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
      quotationNo: item.quotation.quotationNo,
      quotationDate: item.quotation.quotationDate,
      quotationStatus: item.quotation.status,
      customerName: item.quotation.customer.name,
      customerId: item.quotation.customer.id,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Past prices error:", error);
    return NextResponse.json({ error: "Failed to fetch past prices" }, { status: 500 });
  }
}
