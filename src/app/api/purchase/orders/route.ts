import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { POStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as POStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { poNo: { contains: search, mode: "insensitive" as const } },
        { vendor: { name: { contains: search, mode: "insensitive" as const } } },
        { salesOrder: { soNo: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        salesOrder: {
          select: { id: true, soNo: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        items: true,
      },
      orderBy: { poDate: "desc" },
    });

    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
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
      vendorId,
      prId,
      salesOrderId,
      deliveryDate,
      specialRequirements,
      currency,
      items,
    } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      );
    }

    // Validate vendor is approved
    const vendor = await prisma.vendorMaster.findUnique({
      where: { id: vendorId },
      select: { approvedStatus: true, name: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    if (!vendor.approvedStatus) {
      return NextResponse.json(
        { error: `Vendor "${vendor.name}" is not approved. Only approved vendors can be used for Purchase Orders.` },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate PO number (PO/YY/NNNNN)
    const year = new Date().getFullYear().toString().slice(-2);
    const currentFY =
      new Date().getMonth() >= 3
        ? year
        : (parseInt(year) - 1).toString().padStart(2, "0");

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "PURCHASE_ORDER" },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await prisma.documentSequence.update({
        where: { documentType: "PURCHASE_ORDER" },
        data: { currentNumber: nextNumber },
      });
    } else {
      await prisma.documentSequence.create({
        data: {
          documentType: "PURCHASE_ORDER",
          prefix: "PO",
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const poNo = `PO/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount),
      0
    );

    // Create PO with items
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNo,
        vendorId,
        prId: prId || null,
        salesOrderId: salesOrderId || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        specialRequirements: specialRequirements || null,
        currency: currency || "INR",
        totalAmount,
        status: "DRAFT",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          })),
        },
      },
      include: {
        vendor: true,
        salesOrder: {
          select: { soNo: true },
        },
        purchaseRequisition: {
          select: { prNo: true },
        },
        items: true,
      },
    });

    // Update PR status if linked
    if (prId) {
      await prisma.purchaseRequisition.update({
        where: { id: prId },
        data: { status: "PO_CREATED" },
      });
    }

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "PurchaseOrder",
      recordId: purchaseOrder.id,
      newValue: JSON.stringify({ poNo: purchaseOrder.poNo }),
    }).catch(console.error);

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
