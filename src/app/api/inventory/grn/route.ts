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

    const where: any = {};

    if (search) {
      where.OR = [
        { grnNo: { contains: search, mode: "insensitive" as const } },
        { vendor: { name: { contains: search, mode: "insensitive" as const } } },
        { purchaseOrder: { poNo: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const grns = await prisma.goodsReceiptNote.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true, status: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        receivedBy: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            sizeLabel: true,
            receivedQtyMtr: true,
            pieces: true,
          },
        },
      },
      orderBy: { grnDate: "desc" },
    });

    return NextResponse.json({ grns });
  } catch (error) {
    console.error("Error fetching GRNs:", error);
    return NextResponse.json(
      { error: "Failed to fetch GRNs" },
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
    const { poId, vendorId, remarks, items } = body;

    if (!poId) {
      return NextResponse.json(
        { error: "Purchase Order is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase Order not found" },
        { status: 404 }
      );
    }

    const grnNo = await generateDocumentNumber("GRN");

    const grn = await prisma.$transaction(async (tx) => {
      const createdGrn = await tx.goodsReceiptNote.create({
        data: {
          grnNo,
          poId,
          vendorId: vendorId || po.vendorId,
          receivedById: session.user.id,
          remarks: remarks || null,
          items: {
            create: items.map((item: any, index: number) => ({
              sNo: index + 1,
              product: item.product || null,
              material: item.material || null,
              specification: item.specification || null,
              additionalSpec: item.additionalSpec || null,
              dimensionStd: item.dimensionStd || null,
              sizeLabel: item.sizeLabel || null,
              ends: item.ends || null,
              length: item.length || null,
              heatNo: item.heatNo || null,
              make: item.make || null,
              receivedQtyMtr: parseFloat(item.receivedQtyMtr) || 0,
              pieces: parseInt(item.pieces) || 0,
              mtcNo: item.mtcNo || null,
              mtcDate: item.mtcDate ? new Date(item.mtcDate) : null,
              mtcType: item.mtcType || null,
              tpiAgency: item.tpiAgency || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Create inventory stock entries for each GRN item
      for (const grnItem of createdGrn.items) {
        await tx.inventoryStock.create({
          data: {
            form: grnItem.product,
            product: grnItem.product,
            specification: grnItem.specification,
            additionalSpec: grnItem.additionalSpec,
            dimensionStd: grnItem.dimensionStd,
            sizeLabel: grnItem.sizeLabel,
            ends: grnItem.ends,
            length: grnItem.length,
            heatNo: grnItem.heatNo,
            make: grnItem.make,
            quantityMtr: grnItem.receivedQtyMtr,
            pieces: grnItem.pieces,
            mtcNo: grnItem.mtcNo,
            mtcDate: grnItem.mtcDate,
            mtcType: grnItem.mtcType === "MTC_3_1" ? "MTC_3_1" : grnItem.mtcType === "MTC_3_2" ? "MTC_3_2" : null,
            tpiAgency: grnItem.tpiAgency,
            status: "UNDER_INSPECTION",
            grnItemId: grnItem.id,
          },
        });
      }

      // Update PO status
      const totalPOQty = po.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );

      const allGrns = await tx.goodsReceiptNote.findMany({
        where: { poId },
        include: { items: { select: { receivedQtyMtr: true } } },
      });

      const totalReceivedQty = allGrns.reduce(
        (sum, grn) =>
          sum +
          grn.items.reduce(
            (itemSum, item) => itemSum + Number(item.receivedQtyMtr),
            0
          ),
        0
      );

      const newPOStatus =
        totalReceivedQty >= totalPOQty ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED";

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: newPOStatus },
      });

      return createdGrn;
    });

    const fullGrn = await prisma.goodsReceiptNote.findUnique({
      where: { id: grn.id },
      include: {
        purchaseOrder: { select: { poNo: true } },
        vendor: { select: { name: true } },
        receivedBy: { select: { name: true } },
        items: true,
      },
    });

    return NextResponse.json(fullGrn, { status: 201 });
  } catch (error) {
    console.error("Error creating GRN:", error);
    return NextResponse.json(
      { error: "Failed to create GRN" },
      { status: 500 }
    );
  }
}
