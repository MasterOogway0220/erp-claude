import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { ncrNo: { contains: search, mode: "insensitive" as const } },
        { heatNo: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const ncrs = await prisma.nCR.findMany({
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
        vendor: {
          select: { id: true, name: true },
        },
        purchaseOrder: {
          select: { id: true, poNo: true, status: true },
        },
        closedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { ncrDate: "desc" },
    });

    return NextResponse.json({ ncrs });
  } catch (error) {
    console.error("Error fetching NCRs:", error);
    return NextResponse.json(
      { error: "Failed to fetch NCRs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      grnItemId,
      inventoryStockId,
      heatNo,
      poId,
      vendorId,
      nonConformanceType,
      description,
    } = body;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const ncrNo = await generateDocumentNumber("NCR");

    const ncr = await prisma.nCR.create({
      data: {
        ncrNo,
        grnItemId: grnItemId || null,
        inventoryStockId: inventoryStockId || null,
        heatNo: heatNo || null,
        poId: poId || null,
        vendorId: vendorId || null,
        nonConformanceType: nonConformanceType || null,
        description,
        status: "OPEN",
      },
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
          select: { id: true, heatNo: true, status: true },
        },
        vendor: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true } },
      },
    });

    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    console.error("Error creating NCR:", error);
    return NextResponse.json(
      { error: "Failed to create NCR" },
      { status: 500 }
    );
  }
}
