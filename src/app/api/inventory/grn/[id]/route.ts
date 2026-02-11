import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grn = await prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            status: true,
            vendor: { select: { id: true, name: true } },
          },
        },
        vendor: true,
        receivedBy: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sNo: "asc" },
          include: {
            inventoryStocks: {
              select: {
                id: true,
                status: true,
                heatNo: true,
                location: true,
                rackNo: true,
              },
            },
          },
        },
        mtcDocuments: true,
      },
    });

    if (!grn) {
      return NextResponse.json(
        { error: "GRN not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ grn });
  } catch (error) {
    console.error("Error fetching GRN:", error);
    return NextResponse.json(
      { error: "Failed to fetch GRN" },
      { status: 500 }
    );
  }
}
