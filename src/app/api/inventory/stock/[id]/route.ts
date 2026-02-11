import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";

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

    const stock = await prisma.inventoryStock.findUnique({
      where: { id },
      include: {
        grnItem: {
          include: {
            grn: {
              include: {
                purchaseOrder: {
                  select: { id: true, poNo: true, vendorId: true, vendor: { select: { name: true } } },
                },
                vendor: { select: { id: true, name: true } },
              },
            },
          },
        },
        stockReservations: {
          include: {
            salesOrderItem: {
              include: {
                salesOrder: { select: { id: true, soNo: true } },
              },
            },
          },
        },
        inspections: {
          include: {
            inspector: { select: { name: true } },
            parameters: true,
          },
          orderBy: { inspectionDate: "desc" },
        },
        mtcDocuments: true,
        ncrs: {
          orderBy: { ncrDate: "desc" },
        },
        packingListItems: {
          include: {
            packingList: {
              select: { id: true, plNo: true },
            },
          },
        },
      },
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ stock });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock" },
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, location, rackNo, notes } = body;

    // Role check for status changes
    if (status) {
      const allowedRoles = ["QC", "ADMIN", "MANAGEMENT"];
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json(
          { error: "Only QC, Admin, or Management can change stock status" },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (location !== undefined) updateData.location = location;
    if (rackNo !== undefined) updateData.rackNo = rackNo;
    if (notes !== undefined) updateData.notes = notes;

    const stock = await prisma.inventoryStock.update({
      where: { id },
      data: updateData,
    });

    // Auto-create NCR if status changed to REJECTED
    if (status === "REJECTED") {
      const ncrNo = await generateDocumentNumber("NCR");

      const stockWithGrn = await prisma.inventoryStock.findUnique({
        where: { id },
        include: {
          grnItem: {
            include: {
              grn: { select: { poId: true, vendorId: true } },
            },
          },
        },
      });

      await prisma.nCR.create({
        data: {
          ncrNo,
          grnItemId: stockWithGrn?.grnItemId || null,
          inventoryStockId: id,
          heatNo: stock.heatNo,
          poId: stockWithGrn?.grnItem?.grn?.poId || null,
          vendorId: stockWithGrn?.grnItem?.grn?.vendorId || null,
          nonConformanceType: "REJECTION",
          description: `Stock rejected during quality inspection. Heat No: ${stock.heatNo}`,
          status: "OPEN",
        },
      });
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}
