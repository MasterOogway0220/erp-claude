import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("inspection", "read");
    if (!authorized) return response!;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        grnItem: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            material: true,
            specification: true,
            sizeLabel: true,
            receivedQtyMtr: true,
            pieces: true,
            grn: {
              select: { id: true, grnNo: true, grnDate: true },
            },
          },
        },
        inventoryStock: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            specification: true,
            sizeLabel: true,
            status: true,
            quantityMtr: true,
            pieces: true,
            make: true,
          },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        parameters: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("inspection", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { remarks, parameters, reportPath } = body;

    const existing = await prisma.inspection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (remarks !== undefined) updateData.remarks = remarks;
    if (reportPath !== undefined) updateData.reportPath = reportPath;

    // If parameters are provided, delete existing and recreate
    if (parameters && parameters.length > 0) {
      // Recompute overall result
      const paramResults = parameters.map((p: any) => p.result?.toUpperCase());
      let overallResult: "PASS" | "FAIL" | "HOLD" = "PASS";
      if (paramResults.some((r: string) => r === "FAIL")) {
        overallResult = "FAIL";
      } else if (paramResults.some((r: string) => r === "HOLD")) {
        overallResult = "HOLD";
      }
      updateData.overallResult = overallResult;

      // Mandatory attachment: inspection report required for PASS result
      if (overallResult === "PASS" && !existing.reportPath && !reportPath) {
        return NextResponse.json(
          { error: "Inspection report attachment is mandatory for PASS result" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Delete existing parameters
        await tx.inspectionParameter.deleteMany({
          where: { inspectionId: id },
        });

        // Update inspection with new data and parameters
        await tx.inspection.update({
          where: { id },
          data: {
            ...updateData,
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
        });

        // Update inventory stock status if linked
        // For PASS: leave as UNDER_INSPECTION — QC Release will formally accept
        // For FAIL/HOLD: transition immediately
        if (existing.inventoryStockId && overallResult !== "PASS") {
          const stockStatus = overallResult === "FAIL" ? "REJECTED" : "HOLD";

          await tx.inventoryStock.update({
            where: { id: existing.inventoryStockId },
            data: { status: stockStatus as any },
          });
        }
      });
    } else {
      // Only update remarks
      await prisma.inspection.update({
        where: { id },
        data: updateData,
      });
    }

    const updated = await prisma.inspection.findUnique({
      where: { id },
      include: {
        grnItem: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, status: true },
        },
        inspector: { select: { id: true, name: true } },
        parameters: true,
      },
    });

    if (parameters && parameters.length > 0) {
      createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        tableName: "Inspection",
        recordId: id,
        fieldName: "overallResult",
        oldValue: existing.overallResult,
        newValue: updated?.overallResult || existing.overallResult,
      }).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: "Failed to update inspection" },
      { status: 500 }
    );
  }
}
