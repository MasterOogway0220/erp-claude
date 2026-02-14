import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("inspection", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const result = searchParams.get("result") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { inspectionNo: { contains: search, mode: "insensitive" as const } },
        { inventoryStock: { heatNo: { contains: search, mode: "insensitive" as const } } },
        { grnItem: { heatNo: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (result) {
      where.overallResult = result;
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        grnItem: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            sizeLabel: true,
            grn: {
              select: { id: true, grnNo: true },
            },
          },
        },
        inventoryStock: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            sizeLabel: true,
            status: true,
          },
        },
        inspector: {
          select: { id: true, name: true },
        },
        parameters: true,
      },
      orderBy: { inspectionDate: "desc" },
    });

    return NextResponse.json({ inspections });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("inspection", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { grnItemId, inventoryStockId, inspectionType, remarks, parameters } = body;

    if (!parameters || parameters.length === 0) {
      return NextResponse.json(
        { error: "At least one inspection parameter is required" },
        { status: 400 }
      );
    }

    // Compute overall result from parameters
    const paramResults = parameters.map((p: any) => p.result?.toUpperCase());
    let overallResult: "PASS" | "FAIL" | "HOLD" = "PASS";
    if (paramResults.some((r: string) => r === "FAIL")) {
      overallResult = "FAIL";
    } else if (paramResults.some((r: string) => r === "HOLD")) {
      overallResult = "HOLD";
    }

    const inspectionNo = await generateDocumentNumber("INSPECTION");

    const inspection = await prisma.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          inspectionNo,
          grnItemId: grnItemId || null,
          inventoryStockId: inventoryStockId || null,
          inspectorId: session.user.id,
          inspectionType: inspectionType || null,
          overallResult,
          remarks: remarks || null,
          parameters: {
            create: parameters.map((p: any) => ({
              parameterName: p.parameterName,
              parameterType: p.parameterType || "PASS_FAIL",
              resultValue: p.resultValue || null,
              standardValue: p.standardValue || null,
              tolerance: p.tolerance || null,
              result: p.result || null,
              remarks: p.remarks || null,
            })),
          },
        },
        include: {
          parameters: true,
        },
      });

      // Update inventory stock status based on overall result
      if (inventoryStockId) {
        let stockStatus: "ACCEPTED" | "REJECTED" | "HOLD";
        if (overallResult === "PASS") {
          stockStatus = "ACCEPTED";
        } else if (overallResult === "FAIL") {
          stockStatus = "REJECTED";
        } else {
          stockStatus = "HOLD";
        }

        await tx.inventoryStock.update({
          where: { id: inventoryStockId },
          data: { status: stockStatus },
        });
      }

      return created;
    });

    // Auto-create NCR for rejected material
    if (overallResult === "FAIL") {
      const ncrNo = await generateDocumentNumber("NCR");
      // Fetch heat number from inventory stock if available
      let heatNo: string | null = null;
      if (inventoryStockId) {
        const stock = await prisma.inventoryStock.findUnique({
          where: { id: inventoryStockId },
          select: { heatNo: true, grnItem: { select: { grn: { select: { poId: true, vendorId: true } } } } },
        });
        heatNo = stock?.heatNo || null;
        await prisma.nCR.create({
          data: {
            ncrNo,
            nonConformanceType: "INCOMING_MATERIAL",
            description: `Auto-generated NCR for inspection ${inspection.inspectionNo} - Material failed quality check`,
            status: "OPEN",
            inventoryStockId: inventoryStockId || null,
            grnItemId: grnItemId || null,
            heatNo,
            poId: stock?.grnItem?.grn?.poId || null,
            vendorId: stock?.grnItem?.grn?.vendorId || null,
          },
        });
      } else {
        await prisma.nCR.create({
          data: {
            ncrNo,
            nonConformanceType: "INCOMING_MATERIAL",
            description: `Auto-generated NCR for inspection ${inspection.inspectionNo} - Material failed quality check`,
            status: "OPEN",
            grnItemId: grnItemId || null,
          },
        });
      }
    }

    const fullInspection = await prisma.inspection.findUnique({
      where: { id: inspection.id },
      include: {
        grnItem: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            sizeLabel: true,
          },
        },
        inventoryStock: {
          select: {
            id: true,
            heatNo: true,
            status: true,
          },
        },
        inspector: { select: { id: true, name: true } },
        parameters: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "Inspection",
      recordId: inspection.id,
      newValue: JSON.stringify({ inspectionNo, overallResult }),
    }).catch(console.error);

    return NextResponse.json(fullInspection, { status: 201 });
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: "Failed to create inspection" },
      { status: 500 }
    );
  }
}
