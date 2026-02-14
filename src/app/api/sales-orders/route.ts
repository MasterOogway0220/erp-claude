import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { SOStatus } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as SOStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { soNo: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
        { customerPoNo: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        quotation: { select: { quotationNo: true } },
        items: true,
      },
      orderBy: { soDate: "desc" },
    });

    return NextResponse.json({ salesOrders });
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      customerId,
      quotationId,
      customerPoNo,
      customerPoDate,
      customerPoDocument,
      projectName,
      deliverySchedule,
      paymentTerms,
      items,
      forceCreate,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Credit limit enforcement
    const customer = await prisma.customerMaster.findUnique({
      where: { id: customerId },
      select: { creditLimit: true, name: true },
    });

    if (customer?.creditLimit && Number(customer.creditLimit) > 0 && !forceCreate) {
      const creditLimit = Number(customer.creditLimit);

      // Calculate total outstanding: sum of unpaid invoice amounts minus payment receipts
      const unpaidInvoices = await prisma.invoice.findMany({
        where: {
          customerId,
          status: { in: ["SENT", "PARTIALLY_PAID"] },
        },
        select: { id: true, totalAmount: true },
      });

      const totalInvoiceAmount = unpaidInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      );

      const invoiceIds = unpaidInvoices.map((inv) => inv.id);
      const payments = invoiceIds.length > 0
        ? await prisma.paymentReceipt.findMany({
            where: { invoiceId: { in: invoiceIds } },
            select: { amountReceived: true },
          })
        : [];

      const totalPayments = payments.reduce(
        (sum, p) => sum + Number(p.amountReceived),
        0
      );

      const outstanding = totalInvoiceAmount - totalPayments;

      // Calculate new SO value from items
      const newSOValue = (items || []).reduce(
        (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
        0
      );

      if (outstanding + newSOValue > creditLimit) {
        return NextResponse.json(
          {
            error: `Credit limit exceeded. Outstanding: \u20B9${outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}, New SO: \u20B9${newSOValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}, Credit Limit: \u20B9${creditLimit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            creditLimitExceeded: true,
            outstanding,
            newSOValue,
            creditLimit,
          },
          { status: 400 }
        );
      }
    }

    // Generate SO number
    const soNo = await generateDocumentNumber("SALES_ORDER");

    // Create sales order with items
    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNo,
        customerId,
        quotationId: quotationId || null,
        customerPoNo: customerPoNo || null,
        customerPoDate: customerPoDate ? new Date(customerPoDate) : null,
        customerPoDocument: customerPoDocument || null,
        projectName: projectName || null,
        deliverySchedule: deliverySchedule || null,
        paymentTerms: paymentTerms || null,
        poAcceptanceStatus: "PENDING",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
            totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Update quotation status if linked
    if (quotationId) {
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "WON" },
      });
    }

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "SalesOrder",
      recordId: salesOrder.id,
      newValue: JSON.stringify({ soNo: salesOrder.soNo }),
    }).catch(console.error);

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating sales order:", error);
    return NextResponse.json(
      { error: "Failed to create sales order" },
      { status: 500 }
    );
  }
}
