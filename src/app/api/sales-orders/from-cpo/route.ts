import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { clientPurchaseOrderId, items: itemOverrides } = body;

    if (!clientPurchaseOrderId) {
      return NextResponse.json({ error: "clientPurchaseOrderId is required" }, { status: 400 });
    }

    // Fetch CPO with acceptance and items
    const cpo = await prisma.clientPurchaseOrder.findUnique({
      where: { id: clientPurchaseOrderId },
      include: {
        customer: true,
        quotation: { select: { id: true } },
        poAcceptance: { select: { status: true } },
        items: { orderBy: { sNo: "asc" } },
      },
    });

    if (!cpo) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    // Validate acceptance is issued
    if (!cpo.poAcceptance || cpo.poAcceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "PO Acceptance must be issued before creating a Sales Order" }, { status: 400 });
    }

    // Check no existing SO linked to this CPO
    const existingSO = await prisma.salesOrder.findFirst({
      where: {
        clientPurchaseOrderId,
        status: { not: "CANCELLED" },
      },
    });

    if (existingSO) {
      return NextResponse.json(
        { error: `Sales Order ${existingSO.soNo} already exists for this CPO` },
        { status: 400 }
      );
    }

    // Generate SO number
    const soNo = await generateDocumentNumber("SALES_ORDER", companyId);

    // Build items — use overrides if provided, otherwise copy from CPO
    const soItems = cpo.items.map((cpoItem, idx) => {
      const override = itemOverrides?.find(
        (o: any) => o.quotationItemId === cpoItem.quotationItemId
      );

      const qtyOrdered = override?.qtyOrdered
        ? parseFloat(override.qtyOrdered)
        : Number(cpoItem.qtyOrdered);
      const unitRate = override?.unitRate
        ? parseFloat(override.unitRate)
        : Number(cpoItem.unitRate);

      return {
        sNo: idx + 1,
        product: cpoItem.product,
        material: cpoItem.material,
        additionalSpec: cpoItem.additionalSpec,
        sizeLabel: cpoItem.sizeLabel,
        od: cpoItem.od,
        wt: cpoItem.wt,
        ends: cpoItem.ends,
        quantity: qtyOrdered,
        unitRate: unitRate,
        amount: qtyOrdered * unitRate,
        deliveryDate: cpoItem.deliveryDate,
      };
    });

    // Filter out items with 0 qty (if user removed them via overrides)
    const validItems = soItems.filter((item) => item.quantity > 0);

    if (validItems.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Create SO in transaction
    const salesOrder = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          companyId,
          soNo,
          customerId: cpo.customerId,
          quotationId: cpo.quotationId,
          clientPurchaseOrderId,
          customerPoNo: cpo.clientPoNumber,
          customerPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliverySchedule: cpo.deliverySchedule,
          poAcceptanceStatus: "ACCEPTED",
          processingStatus: "UNPROCESSED",
          status: "OPEN",
          items: {
            create: validItems,
          },
        },
        include: {
          items: { orderBy: { sNo: "asc" } },
          customer: { select: { name: true } },
        },
      });

      return so;
    });

    // Audit log
    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "SalesOrder",
      recordId: salesOrder.id,
      newValue: JSON.stringify({ soNo, clientPurchaseOrderId, itemCount: validItems.length }),
    }).catch(console.error);

    return NextResponse.json(
      {
        ...salesOrder,
        items: salesOrder.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
          od: item.od ? Number(item.od) : null,
          wt: item.wt ? Number(item.wt) : null,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sales order from CPO:", error);
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
  }
}
