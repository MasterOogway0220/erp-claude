import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("labReport", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const reportType = searchParams.get("reportType") || "";
    const heatNo = searchParams.get("heatNo") || "";

    const where: any = {
      ...companyFilter(companyId),
    };

    if (search) {
      where.OR = [
        { reportNo: { contains: search } },
        { heatNo: { contains: search } },
        { itemCode: { contains: search } },
        { labName: { contains: search } },
      ];
    }

    if (reportType) {
      where.reportType = reportType;
    }

    if (heatNo) {
      where.heatNo = { contains: heatNo };
    }

    const labReports = await prisma.labReport.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true, vendor: { select: { name: true } } },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true, specification: true },
        },
        grn: {
          select: { id: true, grnNo: true },
        },
        uploadedBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ labReports });
  } catch (error) {
    console.error("Error fetching lab reports:", error);
    return NextResponse.json({ error: "Failed to fetch lab reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("labReport", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { reportType, heatNo, itemCode, poId, inventoryStockId, grnId, filePath, fileName, labName, testDate, result, remarks } = body;

    if (!reportType) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 });
    }

    const validTypes = ["CHEMICAL", "MECHANICAL", "HYDRO", "IMPACT", "IGC"];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json({ error: `Invalid report type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    if (!heatNo) {
      return NextResponse.json({ error: "Heat number is required" }, { status: 400 });
    }

    // Validate PO exists if provided
    if (poId) {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { id: true } });
      if (!po) {
        return NextResponse.json({ error: "Purchase order not found" }, { status: 400 });
      }
    }

    // Validate inventory stock exists if provided
    if (inventoryStockId) {
      const stock = await prisma.inventoryStock.findUnique({ where: { id: inventoryStockId }, select: { id: true } });
      if (!stock) {
        return NextResponse.json({ error: "Inventory stock not found" }, { status: 400 });
      }
    }

    const reportNo = await generateDocumentNumber("LAB_REPORT", companyId);

    const labReport = await prisma.labReport.create({
      data: {
        companyId,
        reportNo,
        reportType,
        heatNo,
        itemCode: itemCode || null,
        poId: poId || null,
        inventoryStockId: inventoryStockId || null,
        grnId: grnId || null,
        filePath: filePath || null,
        fileName: fileName || null,
        labName: labName || null,
        testDate: testDate ? new Date(testDate) : null,
        result: result || "PENDING",
        remarks: remarks || null,
        uploadedById: session.user.id,
      },
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true },
        },
        uploadedBy: {
          select: { name: true },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "LabReport",
      recordId: labReport.id,
      newValue: JSON.stringify({ reportNo, reportType, heatNo }),
    }).catch(console.error);

    return NextResponse.json({ labReport }, { status: 201 });
  } catch (error) {
    console.error("Error creating lab report:", error);
    return NextResponse.json({ error: "Failed to create lab report" }, { status: 500 });
  }
}
