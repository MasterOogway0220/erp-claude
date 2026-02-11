import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { InvoiceStatus, InvoiceType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as InvoiceStatus | null;
    const invoiceType = searchParams.get("invoiceType") as InvoiceType | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      dispatchNoteId,
      salesOrderId,
      customerId,
      invoiceType,
      dueDate,
      currency,
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
    const isExport = invoiceType === "EXPORT";
    const invoiceNo = await generateDocumentNumber(
      isExport ? "INVOICE_EXPORT" : "INVOICE_DOMESTIC"
    );

    // Calculate subtotal from items
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount),
      0
    );

    // Calculate GST based on customer state and invoice type
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

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

    const totalAmount = subtotal + cgst + sgst + igst;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        invoiceType: invoiceType || "DOMESTIC",
        dispatchNoteId: dispatchNoteId || null,
        salesOrderId,
        customerId,
        subtotal,
        cgst,
        sgst,
        igst,
        totalAmount,
        currency: currency || "INR",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "DRAFT",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: item.sNo || index + 1,
            description: item.description || null,
            heatNo: item.heatNo || null,
            sizeLabel: item.sizeLabel || null,
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

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
