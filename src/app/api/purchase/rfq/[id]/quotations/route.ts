import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    // Verify the RFQ exists and belongs to the company
    const rfq = await prisma.rFQ.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: { vendors: true },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      rfqVendorId,
      quotationRef,
      quotationDate,
      validUntil,
      priceBasis,
      freight,
      testingCharges,
      tpiCharges,
      packingForwarding,
      gstRate,
      deliveryDays,
      paymentTerms,
      remarks,
      items,
    } = body;

    if (!rfqVendorId) {
      return NextResponse.json(
        { error: "RFQ Vendor ID is required" },
        { status: 400 }
      );
    }

    // Verify the RFQVendor belongs to this RFQ
    const rfqVendor = rfq.vendors.find((v) => v.id === rfqVendorId);
    if (!rfqVendor) {
      return NextResponse.json(
        { error: "Vendor not found in this RFQ" },
        { status: 404 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one quotation item is required" },
        { status: 400 }
      );
    }

    // Calculate totalMaterialCost (sum of item amounts)
    const totalMaterialCost = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount || 0),
      0
    );

    // Calculate totalLandedCost
    const freightVal = parseFloat(freight || 0);
    const testingVal = parseFloat(testingCharges || 0);
    const tpiVal = parseFloat(tpiCharges || 0);
    const packingVal = parseFloat(packingForwarding || 0);
    const gstRateVal = parseFloat(gstRate || 0);
    const taxAmount = (totalMaterialCost + freightVal + testingVal + tpiVal + packingVal) * (gstRateVal / 100);
    const totalLandedCost = totalMaterialCost + freightVal + testingVal + tpiVal + packingVal + taxAmount;

    // Create vendor quotation with items
    const quotation = await prisma.vendorQuotation.create({
      data: {
        rfqVendorId,
        quotationRef: quotationRef || null,
        quotationDate: quotationDate ? new Date(quotationDate) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        priceBasis: priceBasis || "EX_WORKS",
        freight: freightVal,
        testingCharges: testingVal,
        tpiCharges: tpiVal,
        packingForwarding: packingVal,
        gstRate: gstRateVal,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        paymentTerms: paymentTerms || null,
        remarks: remarks || null,
        totalMaterialCost,
        totalLandedCost,
        items: {
          create: items.map((item: any) => ({
            sNo: parseInt(item.sNo),
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            deliveryDays: item.deliveryDays ? parseInt(item.deliveryDays) : null,
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        items: {
          orderBy: { sNo: "asc" },
        },
      },
    });

    // Update RFQVendor status to SUBMITTED and set responseDate
    await prisma.rFQVendor.update({
      where: { id: rfqVendorId },
      data: {
        status: "SUBMITTED",
        responseDate: new Date(),
      },
    });

    // Check if all vendors have responded
    const allVendors = rfq.vendors;
    const respondedCount = allVendors.filter(
      (v) => v.status === "SUBMITTED" || v.id === rfqVendorId
    ).length;

    const newRfqStatus =
      respondedCount >= allVendors.length ? "ALL_RESPONDED" : "PARTIALLY_RESPONDED";

    await prisma.rFQ.update({
      where: { id },
      data: { status: newRfqStatus },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "VendorQuotation",
      recordId: quotation.id,
      newValue: JSON.stringify({
        rfqNo: rfq.rfqNo,
        vendorId: rfqVendor.vendorId,
        totalLandedCost,
      }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor quotation:", error);
    return NextResponse.json(
      { error: "Failed to create vendor quotation" },
      { status: 500 }
    );
  }
}
