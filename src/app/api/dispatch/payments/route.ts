import { NextRequest, NextResponse } from "next/server";
import { takeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("payment", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { receiptNo: { contains: search } },
      ];
    }

    // `view=list` asks for the summary shape both list screens need.
    //
    // Only two screens read this endpoint: the payments tab on the dispatch
    // page and the bank-reconciliation screen. Between them they use nothing
    // of the customer but its id and name — every other field on the receipt
    // comes from the receipt itself, and the invoice is already narrowed.
    // Sending the whole customer record means ~30 columns of billing address,
    // GSTIN, PAN and credit terms per row to print one name in a table cell.
    //
    // Both screens also share one React Query key, so they must agree: if one
    // asked for the summary shape and the other for the full one, whichever
    // loaded first would populate the cache and the other would read the wrong
    // shape out of it. Both send this flag, and both use a key of
    // ["payment-receipts", "list"] to stay clear of any future full-shape
    // reader.
    //
    // Opt-in, so a caller that forgets it is merely slow rather than silently
    // handed less data than it needs.
    const summaryOnly = searchParams.get("view") === "list";

    const paymentReceipts = await prisma.paymentReceipt.findMany({
      take: takeFrom(request.nextUrl.searchParams),
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
        customer: summaryOnly ? { select: { id: true, name: true } } : true,
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
    const { authorized, session, response, companyId } = await checkAccess("payment", "write");
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

    // Verify invoice exists in the caller's company
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...companyFilter(companyId) },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    if (invoice.customerId !== customerId) {
      return NextResponse.json(
        { error: "Customer does not match the invoice" },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountReceived);
    const tds = tdsAmount ? parseFloat(tdsAmount) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // Lock the invoice so two receipts for it are checked one after the other
      await tx.$queryRaw`SELECT id FROM Invoice WHERE id = ${invoiceId} FOR UPDATE`;

      const earlier = await tx.paymentReceipt.findMany({
        where: { invoiceId },
        select: { amountReceived: true, tdsAmount: true, referenceNo: true, createdAt: true },
      });

      // A double-click or retry sends the same receipt twice within seconds
      const recentSame = earlier.some(
        (p) => Number(p.amountReceived) === amount &&
          (p.referenceNo || null) === (referenceNo || null) &&
          Date.now() - p.createdAt.getTime() < 60_000
      );
      if (recentSame) return { error: "This payment was just recorded", status: 409 } as const;

      if (referenceNo) {
        const sameRef = await tx.paymentReceipt.findFirst({
          where: { referenceNo, ...companyFilter(companyId) },
          select: { receiptNo: true },
        });
        if (sameRef) {
          return { error: `Reference ${referenceNo} is already on receipt ${sameRef.receiptNo}`, status: 409 } as const;
        }
      }

      const paidBefore = earlier.reduce(
        (sum, p) => sum + Number(p.amountReceived) + Number(p.tdsAmount), 0
      );
      const outstanding = Number(invoice.totalAmount) - paidBefore;
      // 0.01 allows paisa rounding
      if (amount + tds > outstanding + 0.01) {
        return { error: `Amount exceeds the outstanding balance of ${outstanding.toFixed(2)}`, status: 400 } as const;
      }

      const receiptNo = await generateDocumentNumber("RECEIPT", companyId, tx);

      // Create the payment receipt
      const receipt = await tx.paymentReceipt.create({
        data: {
          receiptNo,
          invoiceId,
          customerId: invoice.customerId,
          ...(companyId && { companyId }),
          amountReceived: amount,
          paymentMode: paymentMode || "NEFT",
          referenceNo: referenceNo || null,
          bankName: bankName || null,
          tdsAmount: tds,
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

      const totalPaid = paidBefore + amount + tds;

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

      return { receipt };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const paymentReceipt = result.receipt;

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "PaymentReceipt",
      recordId: paymentReceipt.id,
      newValue: JSON.stringify({ receiptNo: paymentReceipt.receiptNo }),
      companyId,
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
