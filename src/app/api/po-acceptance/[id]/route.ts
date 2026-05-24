import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

// GET /api/po-acceptance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await checkAccess("poAcceptance", "read");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                id: true, name: true, city: true, state: true,
                contactPerson: true, email: true, phone: true,
                gstNo: true, addressLine1: true, addressLine2: true,
              },
            },
            quotation: { select: { id: true, quotationNo: true, quotationDate: true } },
            items: {
              orderBy: { sNo: "asc" },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    // Convert Decimal fields
    const result = {
      ...acceptance,
      clientPurchaseOrder: {
        ...acceptance.clientPurchaseOrder,
        grandTotal: acceptance.clientPurchaseOrder.grandTotal
          ? Number(acceptance.clientPurchaseOrder.grandTotal)
          : null,
        subtotal: acceptance.clientPurchaseOrder.subtotal
          ? Number(acceptance.clientPurchaseOrder.subtotal)
          : null,
        items: acceptance.clientPurchaseOrder.items.map((item) => ({
          ...item,
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
          od: item.od ? Number(item.od) : null,
          wt: item.wt ? Number(item.wt) : null,
        })),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch PO acceptance:", error);
    return NextResponse.json({ error: "Failed to fetch PO acceptance" }, { status: 500 });
  }
}

// PUT /api/po-acceptance/[id] - Update acceptance (edit or change status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, session, response, companyId } = await checkAccess("poAcceptance", "write");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.pOAcceptance.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    const {
      acceptanceDate, committedDeliveryDate, remarks,
      followUpName, followUpEmail, followUpPhone,
      qualityName, qualityEmail, qualityPhone,
      accountsName, accountsEmail, accountsPhone,
      status,
    } = body;

    // If issuing, validate required contacts
    if (status === "ISSUED" && existing.status === "DRAFT") {
      if (!followUpName && !existing.followUpName) {
        return NextResponse.json(
          { error: "Follow-up contact is required to issue acceptance" },
          { status: 400 }
        );
      }
    }

    const acceptance = await prisma.pOAcceptance.update({
      where: { id },
      data: {
        ...(acceptanceDate && { acceptanceDate: new Date(acceptanceDate) }),
        ...(committedDeliveryDate && { committedDeliveryDate: new Date(committedDeliveryDate) }),
        ...(remarks !== undefined && { remarks: remarks || null }),
        ...(followUpName !== undefined && { followUpName: followUpName || null }),
        ...(followUpEmail !== undefined && { followUpEmail: followUpEmail || null }),
        ...(followUpPhone !== undefined && { followUpPhone: followUpPhone || null }),
        ...(qualityName !== undefined && { qualityName: qualityName || null }),
        ...(qualityEmail !== undefined && { qualityEmail: qualityEmail || null }),
        ...(qualityPhone !== undefined && { qualityPhone: qualityPhone || null }),
        ...(accountsName !== undefined && { accountsName: accountsName || null }),
        ...(accountsEmail !== undefined && { accountsEmail: accountsEmail || null }),
        ...(accountsPhone !== undefined && { accountsPhone: accountsPhone || null }),
        ...(status && { status }),
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

    // Audit log for status changes
    if (status && status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          companyId,
          tableName: "POAcceptance",
          recordId: id,
          action: "STATUS_CHANGE",
          fieldName: "status",
          oldValue: existing.status,
          newValue: status,
          userId: session.user.id,
        },
      });
    }

    // Flag letter as generated when issuing
    if (status === "ISSUED" && existing.status === "DRAFT") {
      await prisma.pOAcceptance.update({
        where: { id },
        data: { generatedPath: `generated-${new Date().toISOString()}` },
      });
    }

    return NextResponse.json(acceptance);
  } catch (error) {
    console.error("Failed to update PO acceptance:", error);
    return NextResponse.json({ error: "Failed to update PO acceptance" }, { status: 500 });
  }
}

// PATCH /api/po-acceptance/[id] - Partial update (wizard draft saves: new fields + charge/commercial fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, session, response, companyId } = await checkAccess("poAcceptance", "write");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.pOAcceptance.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    const {
      acceptanceDate, committedDeliveryDate, remarks,
      followUpName, followUpEmail, followUpPhone,
      qualityName, qualityEmail, qualityPhone,
      accountsName, accountsEmail, accountsPhone,
      status,
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

    const acceptance = await prisma.pOAcceptance.update({
      where: { id },
      data: {
        ...(acceptanceDate && { acceptanceDate: new Date(acceptanceDate) }),
        ...(committedDeliveryDate && { committedDeliveryDate: new Date(committedDeliveryDate) }),
        ...(remarks !== undefined && { remarks: remarks || null }),
        ...(followUpName !== undefined && { followUpName: followUpName || null }),
        ...(followUpEmail !== undefined && { followUpEmail: followUpEmail || null }),
        ...(followUpPhone !== undefined && { followUpPhone: followUpPhone || null }),
        ...(qualityName !== undefined && { qualityName: qualityName || null }),
        ...(qualityEmail !== undefined && { qualityEmail: qualityEmail || null }),
        ...(qualityPhone !== undefined && { qualityPhone: qualityPhone || null }),
        ...(accountsName !== undefined && { accountsName: accountsName || null }),
        ...(accountsEmail !== undefined && { accountsEmail: accountsEmail || null }),
        ...(accountsPhone !== undefined && { accountsPhone: accountsPhone || null }),
        ...(status && { status }),
        ...(acceptanceDetails !== undefined && { acceptanceDetails: acceptanceDetails ?? null }),
        ...(wizardStep !== undefined && { wizardStep }),
        ...(gstRate !== undefined && { gstRate: gstRate ?? null }),
        ...(isInterState !== undefined && { isInterState }),
        ...(freight !== undefined && { freight: freight ?? null }),
        ...(freightTaxApplicable !== undefined && { freightTaxApplicable }),
        ...(packingForwarding !== undefined && { packingForwarding: packingForwarding ?? null }),
        ...(packingTaxApplicable !== undefined && { packingTaxApplicable }),
        ...(insurance !== undefined && { insurance: insurance ?? null }),
        ...(insuranceTaxApplicable !== undefined && { insuranceTaxApplicable }),
        ...(otherCharges !== undefined && { otherCharges: otherCharges ?? null }),
        ...(otherChargesTaxApplicable !== undefined && { otherChargesTaxApplicable }),
        ...(testingCharges !== undefined && { testingCharges: testingCharges ?? null }),
        ...(testingTaxApplicable !== undefined && { testingTaxApplicable }),
        ...(tpiCharges !== undefined && { tpiCharges: tpiCharges ?? null }),
        ...(tpiTaxApplicable !== undefined && { tpiTaxApplicable }),
        ...(additionalChargesTotal !== undefined && { additionalChargesTotal: additionalChargesTotal ?? null }),
        ...(subtotal !== undefined && { subtotal: subtotal ?? null }),
        ...(taxableAmount !== undefined && { taxableAmount: taxableAmount ?? null }),
        ...(cgst !== undefined && { cgst: cgst ?? null }),
        ...(sgst !== undefined && { sgst: sgst ?? null }),
        ...(igst !== undefined && { igst: igst ?? null }),
        ...(roundOff !== undefined && { roundOff: roundOff ?? null }),
        ...(grandTotal !== undefined && { grandTotal: grandTotal ?? null }),
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

    // Audit log for status changes
    if (status && status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          companyId,
          tableName: "POAcceptance",
          recordId: id,
          action: "STATUS_CHANGE",
          fieldName: "status",
          oldValue: existing.status,
          newValue: status,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(acceptance);
  } catch (error) {
    console.error("Failed to patch PO acceptance:", error);
    return NextResponse.json({ error: "Failed to update PO acceptance" }, { status: 500 });
  }
}
