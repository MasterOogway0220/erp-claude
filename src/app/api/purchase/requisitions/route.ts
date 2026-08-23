import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { PRStatus } from "@prisma/client";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("purchaseRequisition", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as PRStatus | null;

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { prNo: { contains: search } },
        { salesOrder: { soNo: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // `view=list` asks for the summary shape the purchase list table needs.
    //
    // Three screens read this endpoint. The purchase list table only prints
    // "N item(s)" beside each PR, so the ids are enough to give it a length.
    // The other two copy the lines into the document they are building — the
    // PO form turns each PR line into a PO line, and the RFQ form tabulates
    // them for the vendors — so they need product, material, spec, size,
    // quantity, uom and remarks. Narrowing by default would hand those two
    // documents empty lines with nothing reporting an error.
    //
    // Opt-in for that reason: a caller that forgets the flag is merely slow.
    const summaryOnly = searchParams.get("view") === "list";

    const purchaseRequisitions = await prisma.purchaseRequisition.findMany({
      where,
      include: {
        salesOrder: {
          select: { id: true, soNo: true },
        },
        suggestedVendor: {
          select: { id: true, name: true, city: true },
        },
        items: summaryOnly ? { select: { id: true } } : true,
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
    const { authorized, session, response, companyId } = await checkAccess("purchaseRequisition", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      salesOrderId,
      suggestedVendorId,
      requisitionType,
      requiredByDate,
      remarks,
      departmentId,
      dispatchAddressId,
      items,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // A PR raised against a sales order ships to wherever that order ships.
    // Asking again would be a second chance to get it wrong, and stock or
    // emergency PRs have no customer to pick an address from at all.
    let resolvedDispatchAddressId = dispatchAddressId || null;
    if (!resolvedDispatchAddressId && salesOrderId) {
      const so = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        select: { dispatchAddressId: true },
      });
      resolvedDispatchAddressId = so?.dispatchAddressId ?? null;
    }

    // Generate PR number using shared utility
    const prNo = await generateDocumentNumber("PURCHASE_REQUISITION", companyId);

    // Create PR with items
    const purchaseRequisition = await prisma.purchaseRequisition.create({
      data: {
        prNo,
        companyId,
        salesOrderId: salesOrderId || null,
        suggestedVendorId: suggestedVendorId || null,
        requisitionType: requisitionType || null,
        requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
        remarks: remarks || null,
        departmentId: departmentId || null,
        dispatchAddressId: resolvedDispatchAddressId,
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
      companyId,
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
