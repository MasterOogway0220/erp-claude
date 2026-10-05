import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";

// GET /api/po-acceptance - List all PO acceptances
export async function GET(request: NextRequest) {
  const { authorized, response, companyId } = await checkAccess("poAcceptance", "read");
  if (!authorized) return response!;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { acceptanceNo: { contains: search } },
        { clientPurchaseOrder: { cpoNo: { contains: search } } },
        { clientPurchaseOrder: { clientPoNumber: { contains: search } } },
        { clientPurchaseOrder: { customer: { name: { contains: search } } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const acceptances = await prisma.pOAcceptance.findMany({
      where,
      include: {
        clientPurchaseOrder: {
          include: {
            customer: { select: { id: true, name: true, city: true } },
            quotation: { select: { id: true, quotationNo: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = acceptances.map((a) => ({
      ...a,
      clientPurchaseOrder: {
        ...a.clientPurchaseOrder,
        grandTotal: a.clientPurchaseOrder.grandTotal
          ? Number(a.clientPurchaseOrder.grandTotal)
          : null,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch PO acceptances:", error);
    return NextResponse.json({ error: "Failed to fetch PO acceptances" }, { status: 500 });
  }
}

// POST /api/po-acceptance - Create PO Acceptance
export async function POST(request: NextRequest) {
  const { authorized, session, response, companyId } = await checkAccess("poAcceptance", "write");
  if (!authorized) return response!;

  try {
    const body = await request.json();
    const {
      clientPurchaseOrderId,
      acceptanceDate,
      committedDeliveryDate,
      remarks,
      followUpName, followUpEmail, followUpPhone,
      qualityName, qualityEmail, qualityPhone,
      accountsName, accountsEmail, accountsPhone,
      acceptanceDetails,
      wizardStep,
      gstRate, isInterState,
      freight, freightTaxApplicable,
      packingForwarding, packingTaxApplicable,
      insurance, insuranceTaxApplicable,
      otherCharges, otherChargesTaxApplicable,
      testingCharges, testingTaxApplicable,
      tpiCharges, tpiTaxApplicable,
      additionalChargesTotal, subtotal, taxableAmount,
      cgst, sgst, igst, roundOff, grandTotal,
    } = body;

    if (!clientPurchaseOrderId || !acceptanceDate || !committedDeliveryDate) {
      return NextResponse.json(
        { error: "Client PO, acceptance date, and committed delivery date are required" },
        { status: 400 }
      );
    }

    // Verify CPO exists and is REGISTERED; also load charge fields for seeding
    const cpo = await prisma.clientPurchaseOrder.findUnique({
      where: { id: clientPurchaseOrderId },
      select: {
        status: true,
        gstRate: true, isInterState: true,
        freight: true, freightTaxApplicable: true,
        packingForwarding: true, packingTaxApplicable: true,
        insurance: true, insuranceTaxApplicable: true,
        otherCharges: true, otherChargesTaxApplicable: true,
        testingCharges: true, testingTaxApplicable: true,
        tpiCharges: true, tpiTaxApplicable: true,
        additionalChargesTotal: true, subtotal: true, taxableAmount: true,
        cgst: true, sgst: true, igst: true, roundOff: true, grandTotal: true,
      },
    });

    if (!cpo) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    if (cpo.status !== "REGISTERED") {
      return NextResponse.json(
        { error: "Only REGISTERED Client POs can have acceptance issued" },
        { status: 400 }
      );
    }

    // Check if acceptance already exists for this CPO
    const existing = await prisma.pOAcceptance.findUnique({
      where: { clientPurchaseOrderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "PO Acceptance already exists for this Client PO" },
        { status: 400 }
      );
    }

    const acceptanceNo = await generateDocumentNumber("PO_ACCEPTANCE", companyId);

    const acceptance = await prisma.pOAcceptance.create({
      data: {
        companyId,
        acceptanceNo,
        clientPurchaseOrderId,
        acceptanceDate: new Date(acceptanceDate),
        committedDeliveryDate: new Date(committedDeliveryDate),
        remarks: remarks || null,
        followUpName: followUpName || null,
        followUpEmail: followUpEmail || null,
        followUpPhone: followUpPhone || null,
        qualityName: qualityName || null,
        qualityEmail: qualityEmail || null,
        qualityPhone: qualityPhone || null,
        accountsName: accountsName || null,
        accountsEmail: accountsEmail || null,
        accountsPhone: accountsPhone || null,
        acceptanceDetails: acceptanceDetails ?? null,
        wizardStep: wizardStep ?? 1,
        gstRate: gstRate ?? cpo?.gstRate ?? null,
        isInterState: isInterState ?? cpo?.isInterState ?? false,
        freight: freight ?? cpo?.freight ?? null,
        freightTaxApplicable: freightTaxApplicable ?? cpo?.freightTaxApplicable ?? false,
        packingForwarding: packingForwarding ?? cpo?.packingForwarding ?? null,
        packingTaxApplicable: packingTaxApplicable ?? cpo?.packingTaxApplicable ?? false,
        insurance: insurance ?? cpo?.insurance ?? null,
        insuranceTaxApplicable: insuranceTaxApplicable ?? cpo?.insuranceTaxApplicable ?? false,
        otherCharges: otherCharges ?? cpo?.otherCharges ?? null,
        otherChargesTaxApplicable: otherChargesTaxApplicable ?? cpo?.otherChargesTaxApplicable ?? false,
        testingCharges: testingCharges ?? cpo?.testingCharges ?? null,
        testingTaxApplicable: testingTaxApplicable ?? cpo?.testingTaxApplicable ?? false,
        tpiCharges: tpiCharges ?? cpo?.tpiCharges ?? null,
        tpiTaxApplicable: tpiTaxApplicable ?? cpo?.tpiTaxApplicable ?? false,
        additionalChargesTotal: additionalChargesTotal ?? cpo?.additionalChargesTotal ?? null,
        subtotal: subtotal ?? cpo?.subtotal ?? null,
        taxableAmount: taxableAmount ?? cpo?.taxableAmount ?? null,
        cgst: cgst ?? cpo?.cgst ?? null,
        sgst: sgst ?? cpo?.sgst ?? null,
        igst: igst ?? cpo?.igst ?? null,
        roundOff: roundOff ?? cpo?.roundOff ?? null,
        grandTotal: grandTotal ?? cpo?.grandTotal ?? null,
        status: "DRAFT",
        createdById: session.user.id,
      },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            quotation: { select: { id: true, quotationNo: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        companyId,
        tableName: "POAcceptance",
        recordId: acceptance.id,
        action: "CREATE",
        newValue: JSON.stringify({ acceptanceNo, clientPurchaseOrderId }),
        userId: session.user.id,
      },
    });

    return NextResponse.json(acceptance, { status: 201 });
  } catch (error) {
    console.error("Failed to create PO acceptance:", error);
    return NextResponse.json({ error: "Failed to create PO acceptance" }, { status: 500 });
  }
}
