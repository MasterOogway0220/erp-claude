import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("payment", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { receiptNo: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const paymentReceipts = await prisma.paymentReceipt.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            totalAmount: true,
            status: true,
          },
        },
        customer: true,
      },
      orderBy: { receiptDate: "desc" },
    });

    return NextResponse.json({ paymentReceipts });
  } catch (error) {
    console.error("Error fetching payment receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment receipts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("payment", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      invoiceId,
      customerId,
      amountReceived,
      paymentMode,
      referenceNo,
      bankName,
      tdsAmount,
      chequeNo,
      chequeDate,
      remarks,
    } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice is required" },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    if (!amountReceived || parseFloat(amountReceived) <= 0) {
      return NextResponse.json(
        { error: "Valid amount received is required" },
        { status: 400 }
      );
    }

    // Verify invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const receiptNo = await generateDocumentNumber("RECEIPT");

    const paymentReceipt = await prisma.$transaction(async (tx) => {
      // Create the payment receipt
      const receipt = await tx.paymentReceipt.create({
        data: {
          receiptNo,
          invoiceId,
          customerId,
          amountReceived: parseFloat(amountReceived),
          paymentMode: paymentMode || "NEFT",
          referenceNo: referenceNo || null,
          bankName: bankName || null,
          tdsAmount: tdsAmount ? parseFloat(tdsAmount) : 0,
          chequeNo: chequeNo || null,
          chequeDate: chequeDate ? new Date(chequeDate) : null,
          remarks: remarks || null,
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNo: true,
              totalAmount: true,
            },
          },
          customer: true,
        },
      });

      // Calculate total payments for this invoice
      const allPayments = await tx.paymentReceipt.findMany({
        where: { invoiceId },
        select: { amountReceived: true, tdsAmount: true },
      });

      const totalPaid = allPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amountReceived) + Number(payment.tdsAmount),
        0
      );

      // Update invoice status based on total payments
      const invoiceTotalAmount = Number(invoice.totalAmount);

      let newStatus: "PAID" | "PARTIALLY_PAID";
      if (totalPaid >= invoiceTotalAmount) {
        newStatus = "PAID";
      } else {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      return receipt;
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "PaymentReceipt",
      recordId: paymentReceipt.id,
      newValue: JSON.stringify({ receiptNo: paymentReceipt.receiptNo }),
    }).catch(console.error);

    return NextResponse.json(paymentReceipt, { status: 201 });
  } catch (error) {
    console.error("Error creating payment receipt:", error);
    return NextResponse.json(
      { error: "Failed to create payment receipt" },
      { status: 500 }
    );
  }
}
