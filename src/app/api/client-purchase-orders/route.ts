import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("clientPO", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { cpoNo: { contains: search } },
        { clientPoNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { quotation: { quotationNo: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const clientPOs = await prisma.clientPurchaseOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, city: true } },
        quotation: { select: { id: true, quotationNo: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ clientPOs });
  } catch (error) {
    console.error("Error fetching client purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch client purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("clientPO", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      customerId,
      quotationId,
      clientPoNumber,
      clientPoDate,
      projectName,
      contactPerson,
      paymentTerms,
      deliveryTerms,
      deliverySchedule,
      currency,
      remarks,
      items,
      // Additional Charges
      freight,
      freightTaxApplicable,
      tpiCharges,
      tpiTaxApplicable,
      testingCharges,
      testingTaxApplicable,
      packingForwarding,
      packingTaxApplicable,
      insurance,
      insuranceTaxApplicable,
      otherCharges,
      otherChargesTaxApplicable,
      // GST
      gstRate,
      supplierState,
      clientState,
    } = body;

    // Validations
    if (!customerId) {
      return NextResponse.json({ error: "Client/Customer is required" }, { status: 400 });
    }
    if (!quotationId) {
      return NextResponse.json({ error: "Reference Quotation is required" }, { status: 400 });
    }
    if (!clientPoNumber) {
      return NextResponse.json({ error: "Client P.O. Number is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Validate quotation exists and belongs to this customer
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { id: true, customerId: true, quotationNo: true, status: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }
    if (quotation.customerId !== customerId) {
      return NextResponse.json(
        { error: "Selected quotation does not belong to the chosen customer" },
        { status: 400 }
      );
    }

    // Validate each item: qty ordered must not exceed balance
    const quotationItems = await prisma.quotationItem.findMany({
      where: { quotationId },
      include: {
        clientPOItems: {
          include: {
            clientPurchaseOrder: { select: { status: true } },
          },
        },
      },
    });

    const itemBalanceMap = new Map<string, number>();
    for (const qi of quotationItems) {
      const totalOrdered = qi.clientPOItems
        .filter((cpoItem) => cpoItem.clientPurchaseOrder.status !== "CANCELLED")
        .reduce((sum, cpoItem) => sum + Number(cpoItem.qtyOrdered), 0);
      itemBalanceMap.set(qi.id, Math.max(0, Number(qi.quantity) - totalOrdered));
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qtyOrdered = parseFloat(item.qtyOrdered);

      if (isNaN(qtyOrdered) || qtyOrdered <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Ordered quantity must be a positive number` },
          { status: 400 }
        );
      }

      const balance = itemBalanceMap.get(item.quotationItemId);
      if (balance === undefined) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Quotation item not found` },
          { status: 400 }
        );
      }

      if (qtyOrdered > balance) {
        return NextResponse.json(
          {
            error: `Item ${i + 1} (${item.product || ""}): Ordered qty (${qtyOrdered}) exceeds available balance (${balance}). Already ordered: ${Number(quotationItems.find(qi => qi.id === item.quotationItemId)?.quantity || 0) - balance}`,
          },
          { status: 400 }
        );
      }

      const rate = parseFloat(item.unitRate);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Unit rate must be a positive number` },
          { status: 400 }
        );
      }
    }

    // Generate CPO number
    const cpoNo = await generateDocumentNumber("CLIENT_PO", companyId);

    // Calculate material value (subtotal)
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.qtyOrdered) * parseFloat(item.unitRate)),
      0
    );

    // Parse additional charges
    const parsedCharges = {
      freight: freight ? parseFloat(freight) : 0,
      freightTaxApplicable: !!freightTaxApplicable,
      tpiCharges: tpiCharges ? parseFloat(tpiCharges) : 0,
      tpiTaxApplicable: !!tpiTaxApplicable,
      testingCharges: testingCharges ? parseFloat(testingCharges) : 0,
      testingTaxApplicable: !!testingTaxApplicable,
      packingForwarding: packingForwarding ? parseFloat(packingForwarding) : 0,
      packingTaxApplicable: !!packingTaxApplicable,
      insurance: insurance ? parseFloat(insurance) : 0,
      insuranceTaxApplicable: !!insuranceTaxApplicable,
      otherCharges: otherCharges ? parseFloat(otherCharges) : 0,
      otherChargesTaxApplicable: !!otherChargesTaxApplicable,
    };

    // Total additional charges (all charges regardless of tax applicability)
    const additionalChargesTotal =
      parsedCharges.freight +
      parsedCharges.tpiCharges +
      parsedCharges.testingCharges +
      parsedCharges.packingForwarding +
      parsedCharges.insurance +
      parsedCharges.otherCharges;

    // Taxable amount = material value + only charges where tax is applicable
    let taxableCharges = 0;
    if (parsedCharges.freightTaxApplicable) taxableCharges += parsedCharges.freight;
    if (parsedCharges.tpiTaxApplicable) taxableCharges += parsedCharges.tpiCharges;
    if (parsedCharges.testingTaxApplicable) taxableCharges += parsedCharges.testingCharges;
    if (parsedCharges.packingTaxApplicable) taxableCharges += parsedCharges.packingForwarding;
    if (parsedCharges.insuranceTaxApplicable) taxableCharges += parsedCharges.insurance;
    if (parsedCharges.otherChargesTaxApplicable) taxableCharges += parsedCharges.otherCharges;

    const taxableAmount = subtotal + taxableCharges;

    // GST calculation based on state comparison
    const parsedGstRate = gstRate ? parseFloat(gstRate) : 0;
    const isInterState = !!(supplierState && clientState && supplierState.toLowerCase() !== clientState.toLowerCase());

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (parsedGstRate > 0) {
      if (isInterState) {
        // Inter-state: full IGST
        igst = (taxableAmount * parsedGstRate) / 100;
      } else {
        // Intra-state: split into CGST + SGST
        cgst = (taxableAmount * parsedGstRate) / 200;
        sgst = (taxableAmount * parsedGstRate) / 200;
      }
    }

    // Non-taxable charges still add to total
    const nonTaxableCharges = additionalChargesTotal - taxableCharges;
    const grandTotalBeforeRound = subtotal + additionalChargesTotal + cgst + sgst + igst;
    const roundOffAmount = Math.round(grandTotalBeforeRound) - grandTotalBeforeRound;
    const grandTotal = grandTotalBeforeRound + roundOffAmount;

    const clientPO = await prisma.clientPurchaseOrder.create({
      data: {
        companyId,
        cpoNo,
        customerId,
        quotationId,
        clientPoNumber,
        clientPoDate: clientPoDate ? new Date(clientPoDate) : null,
        projectName: projectName || null,
        contactPerson: contactPerson || null,
        paymentTerms: paymentTerms || null,
        deliveryTerms: deliveryTerms || null,
        deliverySchedule: deliverySchedule || null,
        currency: currency || "INR",
        subtotal,
        // Additional charges
        freight: parsedCharges.freight || null,
        freightTaxApplicable: parsedCharges.freightTaxApplicable,
        tpiCharges: parsedCharges.tpiCharges || null,
        tpiTaxApplicable: parsedCharges.tpiTaxApplicable,
        testingCharges: parsedCharges.testingCharges || null,
        testingTaxApplicable: parsedCharges.testingTaxApplicable,
        packingForwarding: parsedCharges.packingForwarding || null,
        packingTaxApplicable: parsedCharges.packingTaxApplicable,
        insurance: parsedCharges.insurance || null,
        insuranceTaxApplicable: parsedCharges.insuranceTaxApplicable,
        otherCharges: parsedCharges.otherCharges || null,
        otherChargesTaxApplicable: parsedCharges.otherChargesTaxApplicable,
        // GST
        additionalChargesTotal: additionalChargesTotal || null,
        taxableAmount,
        gstRate: parsedGstRate || null,
        cgst: cgst || null,
        sgst: sgst || null,
        igst: igst || null,
        supplierState: supplierState || null,
        clientState: clientState || null,
        isInterState,
        roundOff: roundOffAmount !== 0 ? roundOffAmount : null,
        grandTotal,
        remarks: remarks || null,
        createdById: session.user.id,
        items: {
          create: items.map((item: any, index: number) => ({
            quotationItemId: item.quotationItemId,
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            ends: item.ends || null,
            uom: item.uom || null,
            hsnCode: item.hsnCode || null,
            qtyQuoted: parseFloat(item.qtyQuoted),
            qtyOrdered: parseFloat(item.qtyOrdered),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.qtyOrdered) * parseFloat(item.unitRate),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            remark: item.remark || null,
          })),
        },
      },
      include: {
        customer: true,
        quotation: { select: { quotationNo: true } },
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "ClientPurchaseOrder",
      recordId: clientPO.id,
      newValue: JSON.stringify({
        cpoNo: clientPO.cpoNo,
        clientPoNumber,
        quotationNo: clientPO.quotation.quotationNo,
      }),
    }).catch(console.error);

    return NextResponse.json(clientPO, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client purchase order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create client purchase order" },
      { status: 500 }
    );
  }
}
