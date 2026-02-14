import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("inventory", "read");
    if (!authorized) return response!;

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
    const { authorized, session, response } = await checkAccess("inventory", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { status, location, rackNo, notes, action } = body;

    // Handle partial acceptance: split stock into accepted + rejected
    if (action === "PARTIAL_ACCEPT") {
      const { acceptedQty, acceptedPcs, rejectedQty, rejectedPcs, rejectionNotes } = body;

      const existingStock = await prisma.inventoryStock.findUnique({
        where: { id },
        include: {
          grnItem: {
            include: {
              grn: { select: { poId: true, vendorId: true } },
            },
          },
        },
      });

      if (!existingStock) {
        return NextResponse.json({ error: "Stock not found" }, { status: 404 });
      }

      if (existingStock.status !== "UNDER_INSPECTION") {
        return NextResponse.json(
          { error: "Partial acceptance is only available for stock under inspection" },
          { status: 400 }
        );
      }

      if (!acceptedQty || !rejectedQty || acceptedQty <= 0 || rejectedQty <= 0) {
        return NextResponse.json(
          { error: "Both accepted and rejected quantities must be greater than 0" },
          { status: 400 }
        );
      }

      const totalOriginal = Number(existingStock.quantityMtr);
      const totalSplit = Number(acceptedQty) + Number(rejectedQty);
      if (Math.abs(totalSplit - totalOriginal) > 0.01) {
        return NextResponse.json(
          { error: `Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal original quantity (${totalOriginal})` },
          { status: 400 }
        );
      }

      // Use transaction: update original as accepted, create new record for rejected
      const result = await prisma.$transaction(async (tx) => {
        // Update original stock to accepted with reduced quantity
        const acceptedStock = await tx.inventoryStock.update({
          where: { id },
          data: {
            quantityMtr: acceptedQty,
            pieces: acceptedPcs || existingStock.pieces,
            status: "ACCEPTED",
            notes: notes || existingStock.notes,
          },
        });

        // Create new stock record for rejected portion
        const rejectedStock = await tx.inventoryStock.create({
          data: {
            form: existingStock.form,
            product: existingStock.product,
            specification: existingStock.specification,
            additionalSpec: existingStock.additionalSpec,
            dimensionStd: existingStock.dimensionStd,
            sizeLabel: existingStock.sizeLabel,
            od: existingStock.od,
            wt: existingStock.wt,
            ends: existingStock.ends,
            length: existingStock.length,
            heatNo: existingStock.heatNo,
            make: existingStock.make,
            quantityMtr: rejectedQty,
            pieces: rejectedPcs || 0,
            mtcNo: existingStock.mtcNo,
            mtcDate: existingStock.mtcDate,
            mtcType: existingStock.mtcType,
            tpiAgency: existingStock.tpiAgency,
            location: existingStock.location,
            rackNo: existingStock.rackNo,
            notes: rejectionNotes || `Rejected from partial acceptance. Original stock: ${existingStock.id}`,
            status: "REJECTED",
            grnItemId: existingStock.grnItemId,
          },
        });

        // Auto-create NCR for rejected portion
        const ncrNo = await generateDocumentNumber("NCR");
        await tx.nCR.create({
          data: {
            ncrNo,
            grnItemId: existingStock.grnItemId || null,
            inventoryStockId: rejectedStock.id,
            heatNo: existingStock.heatNo,
            poId: existingStock.grnItem?.grn?.poId || null,
            vendorId: existingStock.grnItem?.grn?.vendorId || null,
            nonConformanceType: "REJECTION",
            description: `Partial rejection during quality inspection. Heat No: ${existingStock.heatNo}. Rejected: ${rejectedQty} Mtr out of ${totalOriginal} Mtr.`,
            status: "OPEN",
          },
        });

        return { acceptedStock, rejectedStock };
      });

      return NextResponse.json(result);
    }

    // Standard status update
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
