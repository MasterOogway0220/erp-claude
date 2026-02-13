import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType") || "";
    const format = searchParams.get("format") || "csv";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let data: any[] = [];
    let columns: { key: string; header: string }[] = [];
    let filename = "export";

    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    switch (reportType) {
      case "sales": {
        const salesOrders = await prisma.salesOrder.findMany({
          where: dateFrom || dateTo ? { soDate: dateFilter } : undefined,
          include: {
            customer: { select: { name: true } },
            items: true,
          },
          orderBy: { soDate: "desc" },
        });
        data = salesOrders.map((so) => ({
          soNo: so.soNo,
          date: so.soDate.toISOString().split("T")[0],
          customer: so.customer.name,
          status: so.status,
          items: so.items.length,
          totalAmount: so.items.reduce((s, i) => s + Number(i.amount), 0).toFixed(2),
        }));
        columns = [
          { key: "soNo", header: "SO Number" },
          { key: "date", header: "Date" },
          { key: "customer", header: "Customer" },
          { key: "status", header: "Status" },
          { key: "items", header: "Items" },
          { key: "totalAmount", header: "Total Amount" },
        ];
        filename = "sales-orders-export";
        break;
      }

      case "inventory": {
        const stocks = await prisma.inventoryStock.findMany({
          orderBy: { createdAt: "desc" },
        });
        data = stocks.map((s) => ({
          heatNo: s.heatNo || "",
          product: s.product || "",
          specification: s.specification || "",
          sizeLabel: s.sizeLabel || "",
          quantityMtr: Number(s.quantityMtr).toFixed(3),
          pieces: s.pieces,
          status: s.status,
          location: s.location || "",
        }));
        columns = [
          { key: "heatNo", header: "Heat No." },
          { key: "product", header: "Product" },
          { key: "specification", header: "Specification" },
          { key: "sizeLabel", header: "Size" },
          { key: "quantityMtr", header: "Qty (Mtr)" },
          { key: "pieces", header: "Pieces" },
          { key: "status", header: "Status" },
          { key: "location", header: "Location" },
        ];
        filename = "inventory-export";
        break;
      }

      case "invoices": {
        const invoices = await prisma.invoice.findMany({
          where: dateFrom || dateTo ? { invoiceDate: dateFilter } : undefined,
          include: { customer: { select: { name: true } } },
          orderBy: { invoiceDate: "desc" },
        });
        data = invoices.map((inv) => ({
          invoiceNo: inv.invoiceNo,
          date: inv.invoiceDate.toISOString().split("T")[0],
          customer: inv.customer.name,
          type: inv.invoiceType,
          subtotal: Number(inv.subtotal).toFixed(2),
          cgst: Number(inv.cgst).toFixed(2),
          sgst: Number(inv.sgst).toFixed(2),
          igst: Number(inv.igst).toFixed(2),
          total: Number(inv.totalAmount).toFixed(2),
          status: inv.status,
        }));
        columns = [
          { key: "invoiceNo", header: "Invoice No." },
          { key: "date", header: "Date" },
          { key: "customer", header: "Customer" },
          { key: "type", header: "Type" },
          { key: "subtotal", header: "Subtotal" },
          { key: "cgst", header: "CGST" },
          { key: "sgst", header: "SGST" },
          { key: "igst", header: "IGST" },
          { key: "total", header: "Total" },
          { key: "status", header: "Status" },
        ];
        filename = "invoices-export";
        break;
      }

      case "purchase-orders": {
        const pos = await prisma.purchaseOrder.findMany({
          where: dateFrom || dateTo ? { poDate: dateFilter } : undefined,
          include: { vendor: { select: { name: true } } },
          orderBy: { poDate: "desc" },
        });
        data = pos.map((po) => ({
          poNo: po.poNo,
          date: po.poDate.toISOString().split("T")[0],
          vendor: po.vendor.name,
          status: po.status,
          totalAmount: Number(po.totalAmount || 0).toFixed(2),
          currency: po.currency,
        }));
        columns = [
          { key: "poNo", header: "PO Number" },
          { key: "date", header: "Date" },
          { key: "vendor", header: "Vendor" },
          { key: "status", header: "Status" },
          { key: "totalAmount", header: "Total Amount" },
          { key: "currency", header: "Currency" },
        ];
        filename = "purchase-orders-export";
        break;
      }

      case "ncr": {
        const ncrs = await prisma.nCR.findMany({
          where: dateFrom || dateTo ? { ncrDate: dateFilter } : undefined,
          include: { vendor: { select: { name: true } } },
          orderBy: { ncrDate: "desc" },
        });
        data = ncrs.map((n) => ({
          ncrNo: n.ncrNo,
          date: n.ncrDate.toISOString().split("T")[0],
          heatNo: n.heatNo || "",
          type: n.nonConformanceType || "",
          vendor: n.vendor?.name || "",
          status: n.status,
          disposition: n.disposition || "",
          rootCause: n.rootCause || "",
        }));
        columns = [
          { key: "ncrNo", header: "NCR No." },
          { key: "date", header: "Date" },
          { key: "heatNo", header: "Heat No." },
          { key: "type", header: "Type" },
          { key: "vendor", header: "Vendor" },
          { key: "status", header: "Status" },
          { key: "disposition", header: "Disposition" },
          { key: "rootCause", header: "Root Cause" },
        ];
        filename = "ncr-export";
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Generate CSV
    const header = columns.map((c) => `"${c.header}"`).join(",");
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col.key];
        const str = val !== null && val !== undefined ? String(val) : "";
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");

    const dateStr = new Date().toISOString().split("T")[0];
    return new NextResponse("\ufeff" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating export:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
