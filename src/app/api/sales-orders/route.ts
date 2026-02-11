import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as SOStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { soNo: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
        { customerPoNo: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        quotation: { select: { quotationNo: true } },
        items: true,
      },
      orderBy: { soDate: "desc" },
    });

    return NextResponse.json({ salesOrders });
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      quotationId,
      customerPoNo,
      customerPoDate,
      customerPoDocument,
      items,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Generate SO number (SO/YY/NNNNN)
    const year = new Date().getFullYear().toString().slice(-2);
    const currentFY = new Date().getMonth() >= 3 ? year : (parseInt(year) - 1).toString().padStart(2, "0");

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "SALES_ORDER" },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await prisma.documentSequence.update({
        where: { documentType: "SALES_ORDER" },
        data: { currentNumber: nextNumber },
      });
    } else {
      await prisma.documentSequence.create({
        data: {
          documentType: "SALES_ORDER",
          prefix: "SO",
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const soNo = `SO/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    // Create sales order with items
    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNo,
        customerId,
        quotationId: quotationId || null,
        customerPoNo: customerPoNo || null,
        customerPoDate: customerPoDate ? new Date(customerPoDate) : null,
        customerPoDocument: customerPoDocument || null,
        poAcceptanceStatus: "ACCEPTED",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
            totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Update quotation status if linked
    if (quotationId) {
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "WON" },
      });
    }

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating sales order:", error);
    return NextResponse.json(
      { error: "Failed to create sales order" },
      { status: 500 }
    );
  }
}
