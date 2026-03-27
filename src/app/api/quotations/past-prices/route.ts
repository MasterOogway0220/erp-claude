import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { companyFilter } from "@/lib/rbac";

// GET /api/quotations/past-prices?customerId=...
// Returns past quotations for ALL customers from the same company (by name)
// so that quotes for any client at that company are visible
export async function GET(request: NextRequest) {
  const { authorized, response, companyId } = await checkAccess("quotation", "read");
  if (!authorized) return response;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId")?.trim();

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Look up the selected customer's company name
    const selectedCustomer = await prisma.customerMaster.findUnique({
      where: { id: customerId },
      select: { name: true },
    });

    if (!selectedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Find all customers with the same company name
    const sameCompanyCustomers = await prisma.customerMaster.findMany({
      where: {
        name: selectedCustomer.name,
        ...companyFilter(companyId),
      },
      select: { id: true, name: true, contactPerson: true },
    });

    const customerIds = sameCompanyCustomers.map((c) => c.id);
    const customerMap = new Map(sameCompanyCustomers.map((c) => [c.id, c]));

    // Fetch past quotations for ALL customers from the same company
    const quotations = await prisma.quotation.findMany({
      where: {
        customerId: { in: customerIds },
        ...companyFilter(companyId),
      },
      select: {
        id: true,
        quotationNo: true,
        quotationDate: true,
        status: true,
        quotationCategory: true,
        customerId: true,
        items: {
          select: {
            id: true,
            product: true,
            material: true,
            additionalSpec: true,
            itemDescription: true,
            sizeLabel: true,
            schedule: true,
            unitRate: true,
            uom: true,
            quantity: true,
            materialCodeId: true,
            materialCodeLabel: true,
            sizeId: true,
            od: true,
            wt: true,
            length: true,
            ends: true,
            delivery: true,
            remark: true,
            unitWeight: true,
            totalWeightMT: true,
            taxRate: true,
            hsnCode: true,
            fittingId: true,
            fitting: { select: { type: true, size: true, materialGrade: true } },
            flangeId: true,
            flange: { select: { type: true, size: true, rating: true, materialGrade: true } },
          },
        },
      },
      orderBy: { quotationDate: "desc" },
      take: 50,
    });

    // Format: list of quotations with their items + customer info
    const results = quotations.map((q) => {
      const cust = customerMap.get(q.customerId);
      return {
        id: q.id,
        quotationNo: q.quotationNo,
        quotationDate: q.quotationDate,
        status: q.status,
        quotationCategory: q.quotationCategory,
        customerName: cust?.name || "",
        contactPerson: cust?.contactPerson || "",
        itemCount: q.items.length,
        items: q.items.map((item) => ({
          id: item.id,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          itemDescription: item.itemDescription,
          sizeLabel: item.sizeLabel,
          schedule: item.schedule,
          unitRate: item.unitRate ? Number(item.unitRate) : null,
          uom: item.uom,
          quantity: item.quantity ? Number(item.quantity) : null,
          materialCodeId: item.materialCodeId,
          materialCodeLabel: item.materialCodeLabel,
          sizeId: item.sizeId,
          od: item.od ? Number(item.od) : null,
          wt: item.wt ? Number(item.wt) : null,
          length: item.length,
          ends: item.ends,
          delivery: item.delivery,
          remark: item.remark,
          unitWeight: item.unitWeight ? Number(item.unitWeight) : null,
          totalWeightMT: item.totalWeightMT ? Number(item.totalWeightMT) : null,
          taxRate: item.taxRate ? Number(item.taxRate) : null,
          hsnCode: item.hsnCode,
          fittingId: item.fittingId,
          fittingLabel: item.fitting ? `${item.fitting.type} ${item.fitting.size} ${item.fitting.materialGrade}` : null,
          flangeId: item.flangeId,
          flangeLabel: item.flange ? `${item.flange.type} ${item.flange.size} ${item.flange.rating} ${item.flange.materialGrade}` : null,
        })),
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Past prices error:", error);
    return NextResponse.json({ error: "Failed to fetch past prices" }, { status: 500 });
  }
}
