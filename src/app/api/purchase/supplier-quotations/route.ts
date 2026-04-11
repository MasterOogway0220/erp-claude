import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const vendorId = searchParams.get("vendorId") || "";
    const cFilter = companyFilter(companyId);

    const where: any = { ...cFilter };

    if (search) {
      where.OR = [
        { sqNo: { contains: search } },
        { vendorRef: { contains: search } },
        { vendor: { name: { contains: search } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const quotations = await prisma.supplierQuotation.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, city: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true, documents: true, charges: true } },
      },
      orderBy: { sqDate: "desc" },
    });

    return NextResponse.json(
      quotations.map((sq) => ({
        ...sq,
        subtotal: sq.subtotal ? Number(sq.subtotal) : null,
        totalCharges: sq.totalCharges ? Number(sq.totalCharges) : null,
        grandTotal: sq.grandTotal ? Number(sq.grandTotal) : null,
      }))
    );
  } catch (error) {
    console.error("Error fetching supplier quotations:", error);
    return NextResponse.json({ error: "Failed to fetch supplier quotations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      vendorId, vendorRef, quotationDate, validUntil,
      currency, paymentTerms, deliveryDays, priceBasis,
      rfqId, rfqVendorId, prId, remarks, items, charges,
    } = body;

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const sqNo = await generateDocumentNumber("SUPPLIER_QUOTATION", companyId);

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);

    const totalCharges = (charges || []).reduce((sum: number, c: any) => {
      return sum + (parseFloat(c.amount) || 0);
    }, 0);

    const grandTotal = subtotal + totalCharges;

    const sq = await prisma.supplierQuotation.create({
      data: {
        companyId,
        sqNo,
        vendorId,
        vendorRef: vendorRef || null,
        quotationDate: quotationDate ? new Date(quotationDate) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        currency: currency || "INR",
        paymentTerms: paymentTerms || null,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        priceBasis: priceBasis || null,
        rfqId: rfqId || null,
        rfqVendorId: rfqVendorId || null,
        prId: prId || null,
        subtotal,
        totalCharges,
        grandTotal,
        status: "RECEIVED",
        remarks: remarks || null,
        createdById: session.user.id,
        items: {
          create: items.map((item: any, idx: number) => ({
            sNo: idx + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            pricingUnit: item.pricingUnit || "PER_MTR",
            unitRate: parseFloat(item.unitRate) || 0,
            amount: parseFloat(item.amount) || 0,
            deliveryDays: item.deliveryDays ? parseInt(item.deliveryDays) : null,
            remarks: item.remarks || null,
          })),
        },
        charges: charges && charges.length > 0 ? {
          create: charges.map((c: any) => ({
            chargeType: c.chargeType,
            label: c.label || c.chargeType,
            amount: parseFloat(c.amount) || 0,
            taxApplicable: c.taxApplicable || false,
            remarks: c.remarks || null,
          })),
        } : undefined,
      },
      include: {
        vendor: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        charges: true,
        createdBy: { select: { name: true } },
      },
    });

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "SupplierQuotation",
      recordId: sq.id,
      newValue: JSON.stringify({ sqNo, vendorId, itemCount: items.length }),
    }).catch(console.error);

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating supplier quotation:", error);
    return NextResponse.json({ error: "Failed to create supplier quotation" }, { status: 500 });
  }
}
