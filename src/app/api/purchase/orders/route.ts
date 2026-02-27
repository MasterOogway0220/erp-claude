import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { POStatus } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as POStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { poNo: { contains: search as const } },
        { vendor: { name: { contains: search as const } } },
        { salesOrder: { soNo: { contains: search as const } } },
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
    const { authorized, session, response } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

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

    // Generate PO number
    const poNo = await generateDocumentNumber("PURCHASE_ORDER");

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
