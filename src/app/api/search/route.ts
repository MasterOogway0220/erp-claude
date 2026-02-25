import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchFilter = { contains: q, mode: "insensitive" as const };

    const [
      quotations,
      salesOrders,
      purchaseOrders,
      grns,
      stocks,
      inspections,
      ncrs,
      packingLists,
      dispatchNotes,
      invoices,
    ] = await Promise.all([
      prisma.quotation.findMany({
        where: { quotationNo: searchFilter },
        select: { id: true, quotationNo: true, status: true, customer: { select: { name: true } } },
        take: 5,
        orderBy: { quotationDate: "desc" },
      }),
      prisma.salesOrder.findMany({
        where: { soNo: searchFilter },
        select: { id: true, soNo: true, status: true, customer: { select: { name: true } } },
        take: 5,
        orderBy: { soDate: "desc" },
      }),
      prisma.purchaseOrder.findMany({
        where: { poNo: searchFilter },
        select: { id: true, poNo: true, status: true, vendor: { select: { name: true } } },
        take: 5,
        orderBy: { poDate: "desc" },
      }),
      prisma.goodsReceiptNote.findMany({
        where: { grnNo: searchFilter },
        select: { id: true, grnNo: true, vendor: { select: { name: true } } },
        take: 5,
        orderBy: { grnDate: "desc" },
      }),
      prisma.inventoryStock.findMany({
        where: { heatNo: searchFilter },
        select: { id: true, heatNo: true, product: true, sizeLabel: true, status: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inspection.findMany({
        where: { inspectionNo: searchFilter },
        select: { id: true, inspectionNo: true, overallResult: true },
        take: 5,
        orderBy: { inspectionDate: "desc" },
      }),
      prisma.nCR.findMany({
        where: { ncrNo: searchFilter },
        select: { id: true, ncrNo: true, status: true, heatNo: true },
        take: 5,
        orderBy: { ncrDate: "desc" },
      }),
      prisma.packingList.findMany({
        where: { plNo: searchFilter },
        select: { id: true, plNo: true, salesOrder: { select: { soNo: true } } },
        take: 5,
        orderBy: { plDate: "desc" },
      }),
      prisma.dispatchNote.findMany({
        where: { dnNo: searchFilter },
        select: { id: true, dnNo: true, destination: true },
        take: 5,
        orderBy: { dispatchDate: "desc" },
      }),
      prisma.invoice.findMany({
        where: { invoiceNo: searchFilter },
        select: { id: true, invoiceNo: true, status: true, totalAmount: true },
        take: 5,
        orderBy: { invoiceDate: "desc" },
      }),
    ]);

    const results = [
      ...quotations.map((q) => ({
        type: "Quotation" as const,
        id: q.id,
        label: q.quotationNo,
        description: q.customer?.name || q.status,
        href: `/quotations/${q.id}`,
      })),
      ...salesOrders.map((so) => ({
        type: "Sales Order" as const,
        id: so.id,
        label: so.soNo,
        description: so.customer?.name || so.status,
        href: `/sales-orders/${so.id}`,
      })),
      ...purchaseOrders.map((po) => ({
        type: "Purchase Order" as const,
        id: po.id,
        label: po.poNo,
        description: po.vendor?.name || po.status,
        href: `/purchase/orders/${po.id}`,
      })),
      ...grns.map((g) => ({
        type: "GRN" as const,
        id: g.id,
        label: g.grnNo,
        description: g.vendor?.name || "",
        href: `/inventory/grn/${g.id}`,
      })),
      ...stocks.map((s) => ({
        type: "Stock" as const,
        id: s.id,
        label: s.heatNo || s.id,
        description: [s.product, s.sizeLabel, s.status].filter(Boolean).join(" - "),
        href: `/inventory/stock/${s.id}`,
      })),
      ...inspections.map((i) => ({
        type: "Inspection" as const,
        id: i.id,
        label: i.inspectionNo,
        description: i.overallResult || "",
        href: `/quality/inspections/${i.id}`,
      })),
      ...ncrs.map((n) => ({
        type: "NCR" as const,
        id: n.id,
        label: n.ncrNo,
        description: [n.heatNo, n.status].filter(Boolean).join(" - "),
        href: `/quality/ncr/${n.id}`,
      })),
      ...packingLists.map((pl) => ({
        type: "Packing List" as const,
        id: pl.id,
        label: pl.plNo,
        description: pl.salesOrder?.soNo || "",
        href: `/dispatch/packing-lists/${pl.id}`,
      })),
      ...dispatchNotes.map((dn) => ({
        type: "Dispatch Note" as const,
        id: dn.id,
        label: dn.dnNo,
        description: dn.destination || "",
        href: `/dispatch/dispatch-notes/${dn.id}`,
      })),
      ...invoices.map((inv) => ({
        type: "Invoice" as const,
        id: inv.id,
        label: inv.invoiceNo,
        description: inv.status || "",
        href: `/dispatch/invoices/${inv.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error performing global search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
