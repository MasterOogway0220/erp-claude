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

    // Fetch all active vendors
    const vendors = await prisma.vendorMaster.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
    });

    // Fetch all POs with delivery dates
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        vendorId: true,
        deliveryDate: true,
      },
    });

    // Fetch all GRNs with dates and vendor
    const grns = await prisma.goodsReceiptNote.findMany({
      select: {
        id: true,
        grnDate: true,
        poId: true,
        vendorId: true,
      },
    });

    // Fetch stock by vendor through GRN items -> GRN -> vendor
    const grnItems = await prisma.gRNItem.findMany({
      select: {
        id: true,
        grnId: true,
        inventoryStocks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Fetch NCR counts by vendor
    const ncrsByVendor = await prisma.nCR.groupBy({
      by: ["vendorId"],
      _count: { id: true },
    });

    // Build a map of poId -> PO
    const poMap = new Map(purchaseOrders.map((po) => [po.id, po]));

    // Build a map of grnId -> GRN
    const grnMap = new Map(grns.map((grn) => [grn.id, grn]));

    // Build a map of vendorId -> NCR count
    const ncrMap = new Map(
      ncrsByVendor.map((n) => [n.vendorId, n._count.id])
    );

    // Aggregate per vendor
    const vendorPerformance = vendors.map((vendor) => {
      // POs for this vendor
      const vendorPOs = purchaseOrders.filter(
        (po) => po.vendorId === vendor.id
      );
      const totalPOs = vendorPOs.length;

      // GRNs for this vendor
      const vendorGRNs = grns.filter((grn) => grn.vendorId === vendor.id);
      const totalGRNs = vendorGRNs.length;

      // On-time delivery: GRN received before or on PO deliveryDate
      let onTimeCount = 0;
      let totalDelayDays = 0;
      let countWithDeliveryDate = 0;

      for (const grn of vendorGRNs) {
        const po = poMap.get(grn.poId);
        if (po && po.deliveryDate) {
          countWithDeliveryDate++;
          if (grn.grnDate <= po.deliveryDate) {
            onTimeCount++;
          } else {
            const delayMs = grn.grnDate.getTime() - po.deliveryDate.getTime();
            totalDelayDays += delayMs / (1000 * 60 * 60 * 24);
          }
        }
      }

      const onTimeDeliveryPct =
        countWithDeliveryDate > 0
          ? Number(((onTimeCount / countWithDeliveryDate) * 100).toFixed(1))
          : null;

      const avgDelayDays =
        countWithDeliveryDate - onTimeCount > 0
          ? Number(
              (
                totalDelayDays /
                (countWithDeliveryDate - onTimeCount)
              ).toFixed(1)
            )
          : 0;

      // Rejection percentage: rejected stock from this vendor's GRNs
      const vendorGrnIds = new Set(vendorGRNs.map((g) => g.id));
      const vendorGrnItems = grnItems.filter((gi) =>
        vendorGrnIds.has(gi.grnId)
      );

      let totalStock = 0;
      let rejectedStock = 0;
      for (const gi of vendorGrnItems) {
        for (const stock of gi.inventoryStocks) {
          totalStock++;
          if (stock.status === "REJECTED") {
            rejectedStock++;
          }
        }
      }

      const rejectionPct =
        totalStock > 0
          ? Number(((rejectedStock / totalStock) * 100).toFixed(1))
          : 0;

      const ncrCount = ncrMap.get(vendor.id) ?? 0;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        totalPOs,
        totalGRNs,
        onTimeDeliveryPct,
        rejectionPct,
        ncrCount,
        avgDelayDays,
      };
    });

    // Sort by totalPOs descending
    vendorPerformance.sort((a, b) => b.totalPOs - a.totalPOs);

    return NextResponse.json({ vendors: vendorPerformance });
  } catch (error) {
    console.error("Error fetching vendor performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor performance data" },
      { status: 500 }
    );
  }
}
