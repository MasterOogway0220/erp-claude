import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import type { ClientStatusReportData, StatusReportItem } from "@/lib/pdf/client-status-report-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesOrderId: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { salesOrderId } = await params;

    // Fetch Sales Order with all related data for comprehensive status
    const so = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: {
          select: {
            name: true,
            contactPerson: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pincode: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: { sNo: "asc" },
          include: {
            stockReservations: {
              include: {
                inventoryStock: {
                  select: {
                    id: true,
                    heatNo: true,
                    status: true,
                    quantityMtr: true,
                    pieces: true,
                    inspections: {
                      select: { overallResult: true, inspectionDate: true },
                      orderBy: { inspectionDate: "desc" },
                      take: 1,
                    },
                    qcReleases: {
                      select: { decision: true, releaseDate: true },
                      orderBy: { releaseDate: "desc" },
                      take: 1,
                    },
                    grnItem: {
                      select: {
                        mtcNo: true,
                        mtcType: true,
                        tpiAgency: true,
                      },
                    },
                  },
                },
              },
            },
            warehouseIntimationItems: {
              include: {
                warehouseIntimation: {
                  select: {
                    mprNo: true,
                    status: true,
                    requiredByDate: true,
                  },
                },
              },
            },
          },
        },
        dispatchNotes: {
          select: {
            dnNo: true,
            dispatchDate: true,
            packingList: {
              select: {
                items: {
                  select: {
                    sizeLabel: true,
                    heatNo: true,
                    quantityMtr: true,
                    pieces: true,
                  },
                },
              },
            },
          },
          orderBy: { dispatchDate: "desc" },
        },
        warehouseIntimations: {
          select: {
            mprNo: true,
            status: true,
            requiredByDate: true,
            items: {
              select: {
                salesOrderItemId: true,
                inspectionStatus: true,
                testingStatus: true,
                itemStatus: true,
                preparedQty: true,
                heatNo: true,
                remarks: true,
              },
            },
          },
        },
      },
    });

    if (!so) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    // Build enriched item status for each SO line item
    const reportItems: StatusReportItem[] = so.items.map((soItem) => {
      const qtyOrdered = Number(soItem.quantity);
      const qtyDispatched = Number(soItem.qtyDispatched);
      const qtyBalance = qtyOrdered - qtyDispatched;

      // Find MPR items for this SO item
      const mprItems = soItem.warehouseIntimationItems || [];
      const latestMPR = mprItems.length > 0 ? mprItems[mprItems.length - 1] : null;

      // Material preparation status
      let materialPrepared = "Pending";
      if (latestMPR) {
        const status = latestMPR.itemStatus;
        if (status === "READY" || status === "ISSUED") materialPrepared = "Ready";
        else if (status === "PREPARING") materialPrepared = "In Progress";
        else materialPrepared = "Pending";
      }
      if (qtyDispatched >= qtyOrdered && qtyOrdered > 0) {
        materialPrepared = "Completed";
      }

      // Inspection status - check stock reservations and MPR items
      let inspectionStatus = "Pending";
      if (latestMPR) {
        const mprInsp = latestMPR.inspectionStatus;
        if (mprInsp === "COMPLETED") inspectionStatus = "Completed";
        else if (mprInsp === "IN_PROGRESS") inspectionStatus = "In Progress";
        else if (mprInsp === "NA") inspectionStatus = "N/A";
      }
      // Override with actual inspection data from reserved stock
      const reservations = soItem.stockReservations || [];
      if (reservations.length > 0) {
        const stockWithInspection = reservations.filter(
          (r) => r.inventoryStock.inspections.length > 0
        );
        if (stockWithInspection.length > 0) {
          const allPassed = stockWithInspection.every(
            (r) => r.inventoryStock.inspections[0]?.overallResult === "PASS"
          );
          const anyFailed = stockWithInspection.some(
            (r) => r.inventoryStock.inspections[0]?.overallResult === "FAIL"
          );
          if (allPassed) inspectionStatus = "Completed";
          else if (anyFailed) inspectionStatus = "Failed";
          else inspectionStatus = "In Progress";
        }
      }
      if (qtyDispatched >= qtyOrdered && qtyOrdered > 0) {
        inspectionStatus = "Completed";
      }

      // Testing status - check MTC/TPI from GRN items or MPR
      let testingStatus = "Pending";
      if (latestMPR) {
        const mprTest = latestMPR.testingStatus;
        if (mprTest === "COMPLETED") testingStatus = "Completed";
        else if (mprTest === "IN_PROGRESS") testingStatus = "In Progress";
        else if (mprTest === "NA") testingStatus = "N/A";
      }
      // Override with actual MTC data
      if (reservations.length > 0) {
        const stockWithMTC = reservations.filter(
          (r) => r.inventoryStock.grnItem?.mtcNo
        );
        if (stockWithMTC.length > 0 && stockWithMTC.length === reservations.length) {
          testingStatus = "Completed";
        } else if (stockWithMTC.length > 0) {
          testingStatus = "In Progress";
        }
      }
      if (qtyDispatched >= qtyOrdered && qtyOrdered > 0) {
        testingStatus = "Completed";
      }

      // Heat number - from reservations or MPR
      let heatNo = soItem.heatNo || "";
      if (!heatNo && reservations.length > 0) {
        heatNo = reservations
          .map((r) => r.inventoryStock.heatNo)
          .filter(Boolean)
          .join(", ");
      }
      if (!heatNo && latestMPR?.heatNo) {
        heatNo = latestMPR.heatNo;
      }

      // Expected dispatch date from MPR or SO delivery
      let expectedDispatchDate = "";
      if (soItem.deliveryDate) {
        expectedDispatchDate = formatDateShort(soItem.deliveryDate);
      }
      const mprWithDate = mprItems.find((m) => m.warehouseIntimation?.requiredByDate);
      if (mprWithDate?.warehouseIntimation?.requiredByDate) {
        expectedDispatchDate = formatDateShort(mprWithDate.warehouseIntimation.requiredByDate);
      }

      // Remarks
      let remarks = latestMPR?.remarks || "";
      if (qtyDispatched > 0 && qtyDispatched < qtyOrdered) {
        remarks = remarks ? `${remarks}; Partially dispatched` : "Partially dispatched";
      }

      return {
        sNo: soItem.sNo,
        product: soItem.product || "",
        material: soItem.material || "",
        size: soItem.sizeLabel || "",
        qtyOrdered,
        qtyDispatched,
        qtyBalance,
        materialPrepared,
        inspectionStatus,
        testingStatus,
        heatNo,
        expectedDispatchDate,
        remarks,
      };
    });

    // Summary calculations
    const summary = {
      totalItems: reportItems.length,
      totalOrdered: reportItems.reduce((s, i) => s + i.qtyOrdered, 0),
      totalDispatched: reportItems.reduce((s, i) => s + i.qtyDispatched, 0),
      totalBalance: reportItems.reduce((s, i) => s + i.qtyBalance, 0),
      inspectionComplete: reportItems.filter((i) => i.inspectionStatus === "Completed").length,
      testingComplete: reportItems.filter((i) => i.testingStatus === "Completed").length,
      materialReady: reportItems.filter((i) => i.materialPrepared === "Ready" || i.materialPrepared === "Completed").length,
    };

    const reportData: ClientStatusReportData = {
      reportDate: new Date().toISOString(),
      customer: {
        name: so.customer.name,
        contactPerson: so.customer.contactPerson,
        addressLine1: so.customer.addressLine1,
        city: so.customer.city,
        state: so.customer.state,
        pincode: so.customer.pincode,
      },
      salesOrder: {
        soNo: so.soNo,
        soDate: so.soDate.toISOString(),
        customerPoNo: so.customerPoNo,
        customerPoDate: so.customerPoDate?.toISOString() || null,
        projectName: so.projectName,
        deliverySchedule: so.deliverySchedule,
        status: so.status,
      },
      items: reportItems,
      summary,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating client status report:", error);
    return NextResponse.json({ error: "Failed to generate status report" }, { status: 500 });
  }
}

function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}
