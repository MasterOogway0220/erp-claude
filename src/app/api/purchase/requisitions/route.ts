import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { PRStatus } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("purchaseRequisition", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as PRStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { prNo: { contains: search } },
        { salesOrder: { soNo: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const purchaseRequisitions = await prisma.purchaseRequisition.findMany({
      where,
      include: {
        salesOrder: {
          select: { id: true, soNo: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        items: true,
      },
      orderBy: { prDate: "desc" },
    });

    return NextResponse.json({ purchaseRequisitions });
  } catch (error) {
    console.error("Error fetching purchase requisitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase requisitions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("purchaseRequisition", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      salesOrderId,
      suggestedVendorId,
      requisitionType,
      requiredByDate,
      items,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate PR number using shared utility
    const prNo = await generateDocumentNumber("PURCHASE_REQUISITION");

    // Create PR with items
    const purchaseRequisition = await prisma.purchaseRequisition.create({
      data: {
        prNo,
        salesOrderId: salesOrderId || null,
        suggestedVendorId: suggestedVendorId || null,
        requisitionType: requisitionType || null,
        requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
        requestedById: session.user.id,
        status: "DRAFT",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity),
            uom: item.uom || "MTR",
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        salesOrder: {
          select: { soNo: true },
        },
        suggestedVendor: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "PurchaseRequisition",
      recordId: purchaseRequisition.id,
      newValue: JSON.stringify({ prNo: purchaseRequisition.prNo }),
    }).catch(console.error);

    return NextResponse.json(purchaseRequisition, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to create purchase requisition" },
      { status: 500 }
    );
  }
}
