import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the original PO
    const originalPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!originalPo) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { deliveryDate, specialRequirements, items, changeReason } = body;

    // Calculate new total amount
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount),
      0
    );

    // Create amendment (new PO with incremented version)
    const amendedPo = await prisma.purchaseOrder.create({
      data: {
        poNo: originalPo.poNo,
        vendorId: originalPo.vendorId,
        prId: originalPo.prId,
        salesOrderId: originalPo.salesOrderId,
        version: originalPo.version + 1,
        parentPoId: originalPo.id,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : originalPo.deliveryDate,
        specialRequirements: specialRequirements || originalPo.specialRequirements,
        currency: originalPo.currency,
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

    // Create change log entry
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("id", "tableName", "recordId", "action", "userId", "changes", "timestamp")
      VALUES (
        gen_random_uuid(),
        'PurchaseOrder',
        ${amendedPo.id},
        'AMENDMENT',
        ${session.user.id},
        ${JSON.stringify({
          reason: changeReason,
          originalVersion: originalPo.version,
          newVersion: amendedPo.version,
          originalAmount: originalPo.totalAmount,
          newAmount: totalAmount,
        })},
        NOW()
      )
    `;

    return NextResponse.json(amendedPo, { status: 201 });
  } catch (error) {
    console.error("Error creating PO amendment:", error);
    return NextResponse.json(
      { error: "Failed to create PO amendment" },
      { status: 500 }
    );
  }
}
