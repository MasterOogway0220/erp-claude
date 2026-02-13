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
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { releaseNo: { contains: search, mode: "insensitive" as const } },
        { inspection: { inspectionNo: { contains: search, mode: "insensitive" as const } } },
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { inspectionId, inventoryStockId, decision, remarks } = body;

    if (!inspectionId) {
      return NextResponse.json({ error: "Inspection is required" }, { status: 400 });
    }

    if (!inventoryStockId) {
      return NextResponse.json({ error: "Inventory stock is required" }, { status: 400 });
    }

    // Validate inspection exists with PASS result
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      select: { id: true, overallResult: true, inspectionNo: true },
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

    // Generate release number (use a simple counter format)
    const count = await prisma.qCRelease.count();
    const releaseNo = `QCR/${String(count + 1).padStart(5, "0")}`;

    const qcRelease = await prisma.$transaction(async (tx) => {
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
      const newStatus = decision === "REJECT" ? "REJECTED" : "ACCEPTED";
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

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error("Error creating QC release:", error);
    return NextResponse.json({ error: "Failed to create QC release" }, { status: 500 });
  }
}
