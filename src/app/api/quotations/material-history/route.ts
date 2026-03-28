import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

// GET /api/quotations/material-history?customerId=...&materialCodeId=...
// Returns the most recent past quotation and past PO for a given customer+materialCode combination
export async function GET(request: NextRequest) {
  const { authorized, response, companyId } = await checkAccess("quotation", "read");
  if (!authorized) return response;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId")?.trim();
    const materialCodeId = searchParams.get("materialCodeId")?.trim();

    if (!customerId || !materialCodeId) {
      return NextResponse.json(
        { error: "customerId and materialCodeId are required" },
        { status: 400 }
      );
    }

    // Find all customers from the same company
    const selectedCustomer = await prisma.customerMaster.findUnique({
      where: { id: customerId },
      select: { name: true },
    });
    if (!selectedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const sameCompanyCustomers = await prisma.customerMaster.findMany({
      where: {
        name: selectedCustomer.name,
        ...companyFilter(companyId),
      },
      select: { id: true },
    });
    const customerIds = sameCompanyCustomers.map((c) => c.id);

    // Find the most recent quotation item with this materialCodeId for these customers
    const latestQuoteItem = await prisma.quotationItem.findFirst({
      where: {
        materialCodeId,
        quotation: {
          customerId: { in: customerIds },
          ...companyFilter(companyId),
        },
      },
      select: {
        unitRate: true,
        product: true,
        material: true,
        additionalSpec: true,
        sizeLabel: true,
        sizeId: true,
        schedule: true,
        od: true,
        wt: true,
        length: true,
        ends: true,
        quotation: {
          select: {
            quotationNo: true,
            quotationDate: true,
          },
        },
      },
      orderBy: {
        quotation: { quotationDate: "desc" },
      },
    });

    // Find the most recent Client PO item linked to a quotation item with this materialCodeId
    const latestPOItem = await prisma.clientPOItem.findFirst({
      where: {
        quotationItem: {
          materialCodeId,
          quotation: {
            customerId: { in: customerIds },
            ...companyFilter(companyId),
          },
        },
      },
      select: {
        unitRate: true,
        clientPurchaseOrder: {
          select: {
            clientPoNumber: true,
            cpoNo: true,
            cpoDate: true,
          },
        },
      },
      orderBy: {
        clientPurchaseOrder: { cpoDate: "desc" },
      },
    });

    return NextResponse.json({
      pastQuote: latestQuoteItem
        ? {
            quotationNo: latestQuoteItem.quotation.quotationNo,
            quotationDate: latestQuoteItem.quotation.quotationDate,
            unitRate: latestQuoteItem.unitRate ? Number(latestQuoteItem.unitRate) : null,
            product: latestQuoteItem.product,
            material: latestQuoteItem.material,
            additionalSpec: latestQuoteItem.additionalSpec,
            sizeLabel: latestQuoteItem.sizeLabel,
            sizeId: latestQuoteItem.sizeId,
            schedule: latestQuoteItem.schedule,
            od: latestQuoteItem.od ? Number(latestQuoteItem.od) : null,
            wt: latestQuoteItem.wt ? Number(latestQuoteItem.wt) : null,
            length: latestQuoteItem.length,
            ends: latestQuoteItem.ends,
          }
        : null,
      pastPo: latestPOItem
        ? {
            poNumber: latestPOItem.clientPurchaseOrder.clientPoNumber || latestPOItem.clientPurchaseOrder.cpoNo,
            poDate: latestPOItem.clientPurchaseOrder.cpoDate,
            unitRate: latestPOItem.unitRate ? Number(latestPOItem.unitRate) : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Material history error:", error);
    return NextResponse.json({ error: "Failed to fetch material history" }, { status: 500 });
  }
}
