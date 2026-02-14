import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const heatNo = searchParams.get("heatNo");

    if (!heatNo) {
      return NextResponse.json(
        { error: "heatNo query parameter is required" },
        { status: 400 }
      );
    }

    // Find all inventory stock with this heat number
    const stocks = await prisma.inventoryStock.findMany({
      where: { heatNo: { equals: heatNo, mode: "insensitive" } },
      include: {
        grnItem: {
          include: {
            grn: {
              include: {
                purchaseOrder: {
                  select: {
                    id: true,
                    poNo: true,
                    vendorId: true,
                    vendor: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        inspections: {
          select: {
            id: true,
            inspectionNo: true,
            overallResult: true,
            inspectionDate: true,
            inspectionType: true,
          },
        },
        mtcDocuments: {
          select: {
            id: true,
            mtcNo: true,
            verificationStatus: true,
          },
        },
        stockReservations: {
          include: {
            salesOrderItem: {
              include: {
                salesOrder: {
                  select: {
                    id: true,
                    soNo: true,
                    customer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        packingListItems: {
          include: {
            packingList: {
              include: {
                dispatchNotes: {
                  select: {
                    id: true,
                    dnNo: true,
                    dispatchDate: true,
                  },
                },
              },
            },
          },
        },
        ncrs: {
          select: {
            id: true,
            ncrNo: true,
            status: true,
            nonConformanceType: true,
          },
        },
      },
    });

    // Structure the lifecycle data for each stock item
    const lifecycle = stocks.map((stock) => ({
      stockId: stock.id,
      heatNo: stock.heatNo,
      product: stock.product,
      specification: stock.specification,
      sizeLabel: stock.sizeLabel,
      status: stock.status,
      quantityMtr: stock.quantityMtr,
      pieces: stock.pieces,
      location: stock.location,
      rackNo: stock.rackNo,
      // Procurement chain
      procurement: stock.grnItem
        ? {
            grnId: stock.grnItem.grn.id,
            grnNo: stock.grnItem.grn.grnNo,
            grnDate: stock.grnItem.grn.grnDate,
            poId: stock.grnItem.grn.purchaseOrder?.id,
            poNo: stock.grnItem.grn.purchaseOrder?.poNo,
            vendorName: stock.grnItem.grn.purchaseOrder?.vendor?.name,
          }
        : null,
      // Quality records
      inspections: stock.inspections.map((insp) => ({
        id: insp.id,
        inspectionNo: insp.inspectionNo,
        overallResult: insp.overallResult,
        inspectionDate: insp.inspectionDate,
        inspectionType: insp.inspectionType,
      })),
      mtcDocuments: stock.mtcDocuments.map((mtc) => ({
        id: mtc.id,
        mtcNo: mtc.mtcNo,
        verificationStatus: mtc.verificationStatus,
      })),
      ncrs: stock.ncrs.map((ncr) => ({
        id: ncr.id,
        ncrNo: ncr.ncrNo,
        status: ncr.status,
        type: ncr.nonConformanceType,
      })),
      // Sales & dispatch
      reservations: stock.stockReservations.map((res) => ({
        id: res.id,
        reservedQtyMtr: res.reservedQtyMtr,
        reservedPieces: res.reservedPieces,
        status: res.status,
        salesOrderId: res.salesOrderItem?.salesOrder?.id,
        soNo: res.salesOrderItem?.salesOrder?.soNo,
        customerName: res.salesOrderItem?.salesOrder?.customer?.name,
      })),
      dispatch: stock.packingListItems.map((pli) => ({
        packingListId: pli.packingList.id,
        plNo: pli.packingList.plNo,
        dispatchNotes: pli.packingList.dispatchNotes.map((dn) => ({
          id: dn.id,
          dnNo: dn.dnNo,
          dispatchDate: dn.dispatchDate,
        })),
      })),
    }));

    return NextResponse.json({
      heatNo,
      totalStocks: stocks.length,
      lifecycle,
    });
  } catch (error) {
    console.error("Error searching heat number lifecycle:", error);
    return NextResponse.json(
      { error: "Failed to search heat number lifecycle" },
      { status: 500 }
    );
  }
}
