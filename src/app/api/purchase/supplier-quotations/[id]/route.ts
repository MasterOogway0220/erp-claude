import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const sq = await prisma.supplierQuotation.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, city: true, contactPerson: true, email: true, phone: true } },
        rfq: { select: { id: true, rfqNo: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        charges: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
      },
    });

    if (!sq) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...sq,
      subtotal: sq.subtotal ? Number(sq.subtotal) : null,
      totalCharges: sq.totalCharges ? Number(sq.totalCharges) : null,
      grandTotal: sq.grandTotal ? Number(sq.grandTotal) : null,
      items: sq.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
      })),
      charges: sq.charges.map((c) => ({
        ...c,
        amount: Number(c.amount),
      })),
    });
  } catch (error) {
    console.error("Error fetching supplier quotation:", error);
    return NextResponse.json({ error: "Failed to fetch supplier quotation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.supplierQuotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.vendorRef !== undefined) updateData.vendorRef = body.vendorRef || null;
    if (body.quotationDate !== undefined) updateData.quotationDate = body.quotationDate ? new Date(body.quotationDate) : null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms || null;
    if (body.deliveryDays !== undefined) updateData.deliveryDays = body.deliveryDays ? parseInt(body.deliveryDays) : null;
    if (body.priceBasis !== undefined) updateData.priceBasis = body.priceBasis || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.rfqId !== undefined) updateData.rfqId = body.rfqId || null;

    const updated = await prisma.supplierQuotation.update({
      where: { id },
      data: updateData,
    });

    if (body.status && body.status !== existing.status) {
      createAuditLog({
        companyId,
        userId: session.user.id,
        action: "STATUS_CHANGE",
        tableName: "SupplierQuotation",
        recordId: id,
        fieldName: "status",
        oldValue: existing.status,
        newValue: body.status,
      }).catch(console.error);
    }

    return NextResponse.json({
      ...updated,
      subtotal: updated.subtotal ? Number(updated.subtotal) : null,
      totalCharges: updated.totalCharges ? Number(updated.totalCharges) : null,
      grandTotal: updated.grandTotal ? Number(updated.grandTotal) : null,
    });
  } catch (error) {
    console.error("Error updating supplier quotation:", error);
    return NextResponse.json({ error: "Failed to update supplier quotation" }, { status: 500 });
  }
}
