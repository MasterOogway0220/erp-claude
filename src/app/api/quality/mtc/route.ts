import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const poId = searchParams.get("poId") || "";
    const grnId = searchParams.get("grnId") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { mtcNo: { contains: search as const } },
        { heatNo: { contains: search as const } },
      ];
    }

    if (poId) where.poId = poId;
    if (grnId) where.grnId = grnId;

    const mtcDocuments = await prisma.mTCDocument.findMany({
      where,
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            status: true,
            vendor: { select: { id: true, name: true } },
          },
        },
        grn: {
          select: {
            id: true,
            grnNo: true,
            grnDate: true,
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
      },
      orderBy: { uploadDate: "desc" },
    });

    return NextResponse.json({ mtcDocuments });
  } catch (error) {
    console.error("Error fetching MTC documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch MTC documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { mtcNo, heatNo, filePath, poId, grnId, inventoryStockId, remarks } = body;

    if (!mtcNo) {
      return NextResponse.json(
        { error: "MTC number is required" },
        { status: 400 }
      );
    }

    const mtcDocument = await prisma.mTCDocument.create({
      data: {
        mtcNo,
        heatNo: heatNo || null,
        filePath: filePath || null,
        poId: poId || null,
        grnId: grnId || null,
        inventoryStockId: inventoryStockId || null,
        remarks: remarks || null,
      },
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true },
        },
        grn: {
          select: { id: true, grnNo: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, status: true },
        },
      },
    });

    return NextResponse.json(mtcDocument, { status: 201 });
  } catch (error) {
    console.error("Error creating MTC document:", error);
    return NextResponse.json(
      { error: "Failed to create MTC document" },
      { status: 500 }
    );
  }
}
