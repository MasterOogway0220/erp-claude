import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { numberToWords } from "@/lib/amount-in-words";
import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as InvoiceStatus | null;
    const invoiceType = searchParams.get("invoiceType") as InvoiceType | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (invoiceType) {
      where.invoiceType = invoiceType;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        dispatchNote: {
          select: { id: true, dnNo: true, dispatchDate: true },
        },
        salesOrder: {
          select: { id: true, soNo: true },
        },
        customer: true,
        originalInvoice: {
          select: { id: true, invoiceNo: true, totalAmount: true },
        },
        linkedNotes: {
          select: { id: true, invoiceNo: true, invoiceType: true, totalAmount: true, status: true },
        },
        items: true,
        paymentReceipts: true,
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("invoice", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      dispatchNoteId,
      salesOrderId,
      customerId,
      invoiceType,
      originalInvoiceId,
      dueDate,
      eWayBillNo,
      currency,
      tcsAmount,
      roundOff,
      amountInWords,
      placeOfSupply,
      customerGstin,
      items,
    } = body;

    if (!salesOrderId) {
      return NextResponse.json(
        { error: "Sales Order is required" },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const isCreditNote = invoiceType === "CREDIT_NOTE";
    const isDebitNote = invoiceType === "DEBIT_NOTE";
    const isCreditOrDebit = isCreditNote || isDebitNote;

    // Validate originalInvoiceId for credit/debit notes
    if (isCreditOrDebit) {
      if (!originalInvoiceId) {
        return NextResponse.json(
          { error: "Original invoice is required for credit/debit notes" },
          { status: 400 }
        );
      }
      const originalInvoice = await prisma.invoice.findUnique({
        where: { id: originalInvoiceId },
      });
      if (!originalInvoice) {
        return NextResponse.json(
          { error: "Original invoice not found" },
          { status: 404 }
        );
      }
      if (originalInvoice.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot create credit/debit note against a cancelled invoice" },
          { status: 400 }
        );
      }
    }

    // Fetch customer to determine GST applicability based on state
    const customer = await prisma.customerMaster.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Generate invoice number based on type
    let docType: "CREDIT_NOTE" | "DEBIT_NOTE" | "INVOICE_EXPORT" | "INVOICE_DOMESTIC";
    if (isCreditNote) docType = "CREDIT_NOTE";
    else if (isDebitNote) docType = "DEBIT_NOTE";
    else if (invoiceType === "EXPORT") docType = "INVOICE_EXPORT";
    else docType = "INVOICE_DOMESTIC";

    const invoiceNo = await generateDocumentNumber(docType);

    // Calculate subtotal from items
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount),
      0
    );

    // Calculate GST based on customer state and invoice type
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isExport = invoiceType === "EXPORT";
    if (!isExport) {
      // Use the first item's tax rate as the applicable rate
      // For domestic invoices, calculate GST based on customer state
      const taxRate = items[0]?.taxRate ? parseFloat(items[0].taxRate) : 0;

      if (taxRate > 0) {
        const companyState = "Maharashtra";

        if (customer.state === companyState) {
          // Intra-state: CGST + SGST (each = subtotal * taxRate / 200)
          cgst = subtotal * taxRate / 200;
          sgst = subtotal * taxRate / 200;
        } else {
          // Inter-state: IGST (= subtotal * taxRate / 100)
          igst = subtotal * taxRate / 100;
        }
      }
    }
    // For export invoices, all taxes remain 0

    const parsedTcsAmount = tcsAmount ? parseFloat(tcsAmount) : 0;
    const parsedRoundOff = roundOff ? parseFloat(roundOff) : 0;
    const totalAmount = subtotal + cgst + sgst + igst + parsedTcsAmount + parsedRoundOff;
    const effectiveCurrency = currency || "INR";

    // Auto-calculate amount in words if not provided
    const computedAmountInWords = amountInWords || numberToWords(totalAmount, effectiveCurrency);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        invoiceType: invoiceType || "DOMESTIC",
        dispatchNoteId: dispatchNoteId || null,
        salesOrderId,
        customerId,
        originalInvoiceId: originalInvoiceId || null,
        subtotal,
        cgst,
        sgst,
        igst,
        tcsAmount: parsedTcsAmount,
        roundOff: parsedRoundOff,
        amountInWords: computedAmountInWords,
        placeOfSupply: placeOfSupply || null,
        customerGstin: customerGstin || null,
        totalAmount,
        currency: effectiveCurrency,
        dueDate: dueDate ? new Date(dueDate) : null,
        eWayBillNo: eWayBillNo || null,
        status: "DRAFT",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: item.sNo || index + 1,
            description: item.description || null,
            heatNo: item.heatNo || null,
            sizeLabel: item.sizeLabel || null,
            uom: item.uom || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            hsnCode: item.hsnCode || null,
            taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
          })),
        },
      },
      include: {
        dispatchNote: {
          select: { id: true, dnNo: true },
        },
        salesOrder: {
          select: { id: true, soNo: true },
        },
        customer: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "Invoice",
      recordId: invoice.id,
      newValue: JSON.stringify({ invoiceNo: invoice.invoiceNo }),
    }).catch(console.error);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
