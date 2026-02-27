import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("qcRelease", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { releaseNo: { contains: search } },
        { inspection: { inspectionNo: { contains: search } } },
      ];
    }

    const qcReleases = await prisma.qCRelease.findMany({
      where,
      include: {
        inspection: {
          select: {
            id: true, inspectionNo: true, overallResult: true,
            inventoryStock: {
              select: { id: true, heatNo: true, product: true, sizeLabel: true },
            },
          },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true, status: true, quantityMtr: true, pieces: true },
        },
        releasedBy: { select: { id: true, name: true } },
      },
      orderBy: { releaseDate: "desc" },
    });

    return NextResponse.json({ qcReleases });
  } catch (error) {
    console.error("Error fetching QC releases:", error);
    return NextResponse.json({ error: "Failed to fetch QC releases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("qcRelease", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { inspectionId, inventoryStockId, decision, remarks } = body;

    if (!inspectionId) {
      return NextResponse.json({ error: "Inspection is required" }, { status: 400 });
    }

    if (!inventoryStockId) {
      return NextResponse.json({ error: "Inventory stock is required" }, { status: 400 });
    }

    // Prevent duplicate QC releases for the same stock item
    const existingRelease = await prisma.qCRelease.findFirst({
      where: { inventoryStockId },
      select: { id: true, releaseNo: true },
    });
    if (existingRelease) {
      return NextResponse.json(
        { error: `QC release already exists for this stock item (${existingRelease.releaseNo})` },
        { status: 409 }
      );
    }

    // Validate inspection exists with PASS result
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      select: { id: true, overallResult: true, inspectionNo: true, inventoryStockId: true, reportPath: true },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    if (inspection.overallResult !== "PASS") {
      return NextResponse.json(
        { error: "Inspection must have PASS result for QC release" },
        { status: 400 }
      );
    }

    // Cross-reference: ensure the inspection is for the same stock item
    if (inspection.inventoryStockId !== inventoryStockId) {
      return NextResponse.json(
        { error: "Inspection does not match the selected stock item" },
        { status: 400 }
      );
    }

    // Validate stock is in UNDER_INSPECTION status
    const stock = await prisma.inventoryStock.findUnique({
      where: { id: inventoryStockId },
      select: { id: true, status: true },
    });
    if (!stock) {
      return NextResponse.json({ error: "Inventory stock not found" }, { status: 404 });
    }
    if (stock.status !== StockStatus.UNDER_INSPECTION) {
      return NextResponse.json(
        { error: `Stock must be in UNDER_INSPECTION status for QC release (current: ${stock.status})` },
        { status: 400 }
      );
    }

    // Mandatory attachment checks for ACCEPT decision
    if ((decision || "ACCEPT") === "ACCEPT") {
      // Check inspection report attachment
      if (!inspection.reportPath) {
        return NextResponse.json(
          { error: "Inspection report attachment required before QC acceptance" },
          { status: 400 }
        );
      }

      // Check verified MTC document
      const verifiedMtc = await prisma.mTCDocument.findFirst({
        where: { inventoryStockId, verificationStatus: "VERIFIED" },
        select: { id: true },
      });
      if (!verifiedMtc) {
        return NextResponse.json(
          { error: "Verified MTC document required before QC acceptance" },
          { status: 400 }
        );
      }
    }

    // Generate release number using standardized document numbering
    const releaseNo = await generateDocumentNumber("QC_RELEASE");

    const qcRelease = await prisma.$transaction(async (tx) => {
      // Re-check for duplicates inside transaction to prevent race conditions
      const duplicate = await tx.qCRelease.findFirst({
        where: { inventoryStockId },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error("DUPLICATE_RELEASE");
      }

      const created = await tx.qCRelease.create({
        data: {
          releaseNo,
          inspectionId,
          inventoryStockId,
          decision: decision || "ACCEPT",
          releasedById: session.user.id,
          remarks: remarks || null,
        },
      });

      // Update stock status based on decision
      const statusMap: Record<string, StockStatus> = {
        ACCEPT: StockStatus.ACCEPTED,
        REJECT: StockStatus.REJECTED,
        HOLD: StockStatus.HOLD,
      };
      const newStatus = statusMap[decision || "ACCEPT"] || StockStatus.ACCEPTED;
      await tx.inventoryStock.update({
        where: { id: inventoryStockId },
        data: { status: newStatus },
      });

      return created;
    });

    const full = await prisma.qCRelease.findUnique({
      where: { id: qcRelease.id },
      include: {
        inspection: {
          select: { id: true, inspectionNo: true, overallResult: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true, status: true },
        },
        releasedBy: { select: { name: true } },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "QCRelease",
      recordId: qcRelease.id,
      newValue: JSON.stringify({ releaseNo }),
    }).catch(console.error);

    return NextResponse.json(full, { status: 201 });
  } catch (error: any) {
    if (error?.message === "DUPLICATE_RELEASE") {
      return NextResponse.json(
        { error: "QC release already exists for this stock item" },
        { status: 409 }
      );
    }
    console.error("Error creating QC release:", error);
    return NextResponse.json({ error: "Failed to create QC release" }, { status: 500 });
  }
}
