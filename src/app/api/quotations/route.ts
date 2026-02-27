import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { numberToWords } from "@/lib/amount-in-words";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { QuotationStatus, QuotationType, QuotationCategory } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const showAll = searchParams.get("showAll") === "true";
    const revision = searchParams.get("revision") || "";
    const conversionStatus = searchParams.get("conversionStatus") || ""; // "pending" | "converted"

    const where: any = {};

    if (search) {
      where.OR = [
        { quotationNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    if (status) {
      const statuses = status.split(",").map((s) => s.trim()) as QuotationStatus[];
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }

    // By default, hide SUPERSEDED and REVISED quotations (show only latest active revision)
    if (!showAll && !status) {
      where.status = { notIn: ["SUPERSEDED", "REVISED"] as QuotationStatus[] };
    }

    // Filter by revision type: original (version 0) or revised (version > 0)
    if (revision === "original") {
      where.version = 0;
    } else if (revision === "revised") {
      where.version = { gt: 0 };
    }

    // Conversion status filter: pending (no sales orders) or converted (has sales orders)
    if (conversionStatus === "pending") {
      where.salesOrders = { none: {} };
    } else if (conversionStatus === "converted") {
      where.salesOrders = { some: {} };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        preparedBy: { select: { name: true } },
        dealOwner: { select: { name: true } },
        items: true,
        salesOrders: { select: { id: true, soNo: true } },
      },
      orderBy: [{ quotationNo: "desc" }, { version: "desc" }],
    });

    return NextResponse.json({ quotations });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      customerId,
      quotationType,
      quotationCategory,
      currency,
      validUpto,
      buyerId,
      paymentTermsId,
      deliveryTermsId,
      deliveryPeriod,
      taxRate,
      items,
      terms,
      quotationDate,
      inquiryNo,
      inquiryDate,
      // New fields
      dealOwnerId,
      nextActionDate,
      kindAttention,
      additionalDiscount,
      rcmEnabled,
      roundOff,
      advanceToPay,
      placeOfSupplyCity,
      placeOfSupplyState,
      placeOfSupplyCountry,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate numeric fields on items
    for (let i = 0; i < items.length; i++) {
      const qty = parseFloat(items[i].quantity);
      const rate = parseFloat(items[i].unitRate);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: quantity is required and must be a positive number` },
          { status: 400 }
        );
      }
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: unit rate is required and must be a positive number` },
          { status: 400 }
        );
      }
    }

    // Generate quotation number using shared document numbering utility
    const quotationNo = await generateDocumentNumber("QUOTATION");

    // Calculate financial fields
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
      0
    );
    const parsedDiscount = additionalDiscount ? parseFloat(additionalDiscount) : 0;
    const discountAmount = parsedDiscount > 0 ? (subtotal * parsedDiscount) / 100 : 0;
    const totalAfterDiscount = subtotal - discountAmount;
    const parsedTaxRate = taxRate ? parseFloat(taxRate) : 0;
    // RCM: tax is paid by recipient, so invoice shows 0 tax
    const taxAmount = (!rcmEnabled && parsedTaxRate > 0) ? (totalAfterDiscount * parsedTaxRate) / 100 : 0;
    const grandTotalBeforeRoundOff = totalAfterDiscount + taxAmount;
    const roundOffAmount = roundOff ? (Math.round(grandTotalBeforeRoundOff) - grandTotalBeforeRoundOff) : 0;
    const grandTotal = grandTotalBeforeRoundOff + roundOffAmount;
    const effectiveCurrency = currency || "INR";
    const computedAmountInWords = numberToWords(grandTotal, effectiveCurrency);

    // Create quotation with items and terms
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo,
        customerId,
        quotationType: quotationType || QuotationType.DOMESTIC,
        quotationCategory: quotationCategory || QuotationCategory.STANDARD,
        currency: currency || "INR",
        ...(quotationDate ? { quotationDate: new Date(quotationDate) } : {}),
        validUpto: validUpto ? new Date(validUpto) : null,
        buyerId: buyerId || null,
        inquiryNo: inquiryNo || null,
        inquiryDate: inquiryDate ? new Date(inquiryDate) : null,
        paymentTermsId: paymentTermsId || null,
        deliveryTermsId: deliveryTermsId || null,
        deliveryPeriod: deliveryPeriod || null,
        // New fields
        dealOwnerId: dealOwnerId || null,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
        kindAttention: kindAttention || null,
        additionalDiscount: parsedDiscount || null,
        discountAmount: discountAmount || null,
        totalAfterDiscount: discountAmount > 0 ? totalAfterDiscount : null,
        rcmEnabled: rcmEnabled || false,
        roundOff: roundOff || false,
        roundOffAmount: roundOff ? roundOffAmount : null,
        advanceToPay: advanceToPay ? parseFloat(advanceToPay) : null,
        placeOfSupplyCity: placeOfSupplyCity || null,
        placeOfSupplyState: placeOfSupplyState || null,
        placeOfSupplyCountry: placeOfSupplyCountry || null,
        // Financials
        subtotal,
        taxRate: parsedTaxRate || null,
        taxAmount: taxAmount || null,
        grandTotal,
        amountInWords: computedAmountInWords,
        preparedById: session.user.id,
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeId: item.sizeId || null,
            sizeLabel: item.sizeLabel || null,
            sizeNPS: item.nps ? parseFloat(item.nps) : (item.sizeNPS ? parseFloat(item.sizeNPS) : null),
            schedule: item.schedule || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            length: item.length || null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            delivery: item.delivery || null,
            remark: item.remark || null,
            materialCodeId: item.materialCodeId || null,
            uom: item.uom || null,
            hsnCode: item.hsnCode || null,
            taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
            unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
            totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
            // Internal costing fields
            materialCost: item.materialCost ? parseFloat(item.materialCost) : null,
            logisticsCost: item.logisticsCost ? parseFloat(item.logisticsCost) : null,
            inspectionCost: item.inspectionCost ? parseFloat(item.inspectionCost) : null,
            otherCosts: item.otherCosts ? parseFloat(item.otherCosts) : null,
            totalCostPerUnit: item.totalCostPerUnit ? parseFloat(item.totalCostPerUnit) : null,
            marginPercentage: item.marginPercentage ? parseFloat(item.marginPercentage) : null,
            // Export quotation fields
            tagNo: item.tagNo || null,
            drawingRef: item.drawingRef || null,
            itemDescription: item.itemDescription || null,
            certificateReq: item.certificateReq || null,
            // BOM quotation fields
            itemType: item.itemType || null,
            wtType: item.wtType || null,
            tubeLength: item.tubeLength || null,
            tubeCount: item.tubeCount ? parseInt(item.tubeCount) : null,
            componentPosition: item.componentPosition || null,
          })),
        },
        terms: {
          create: terms?.map((term: any, index: number) => ({
            termNo: index + 1,
            termName: term.termName,
            termValue: term.termValue,
            isDefault: term.isDefault ?? !term.isCustom,
            isIncluded: term.isIncluded ?? true,
            isCustom: term.isCustom ?? false,
            isHeadingEditable: term.isHeadingEditable ?? false,
          })) || [],
        },
      },
      include: {
        customer: true,
        items: true,
        terms: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "Quotation",
      recordId: quotation.id,
      newValue: JSON.stringify({ quotationNo: quotation.quotationNo }),
    }).catch(console.error);

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    console.error("Error creating quotation:", error);
    const message = error?.message || "Failed to create quotation";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
