import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export type StageStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

interface StageDetail {
  name: string;
  status: StageStatus;
  details: string;
  items: { label: string; value: string; href?: string }[];
}

function computeCompletion(stages: { status: StageStatus }[]): number {
  const total = stages.length;
  if (total === 0) return 0;
  let points = 0;
  for (const s of stages) {
    if (s.status === "COMPLETED") points += 1;
    else if (s.status === "IN_PROGRESS") points += 0.5;
  }
  return Math.round((points / total) * 100);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const so = await prisma.salesOrder.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          select: {
            id: true, sNo: true, product: true, material: true,
            sizeLabel: true, quantity: true, qtyDispatched: true, itemStatus: true,
          },
          orderBy: { sNo: "asc" },
        },
        purchaseOrders: {
          select: {
            id: true, poNo: true, status: true, vendorId: true,
            vendor: { select: { name: true } },
            goodsReceiptNotes: {
              select: {
                id: true, grnNo: true, grnDate: true,
                items: {
                  select: {
                    id: true, heatNo: true,
                    inventoryStocks: {
                      select: {
                        id: true, heatNo: true, status: true,
                        inspections: {
                          select: {
                            id: true, inspectionNo: true, overallResult: true,
                            inspectionDate: true,
                          },
                          orderBy: { inspectionDate: "desc" },
                        },
                        qcReleases: {
                          select: { id: true, releaseNo: true, decision: true },
                        },
                        labReports: {
                          select: {
                            id: true, reportNo: true, reportType: true,
                            result: true,
                          },
                        },
                        labLetters: {
                          select: { id: true, letterNo: true, status: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            mtcDocuments: {
              select: {
                id: true, mtcNo: true, verificationStatus: true,
              },
            },
          },
        },
        packingLists: {
          select: {
            id: true, plNo: true, plDate: true,
            items: { select: { id: true } },
          },
        },
        dispatchNotes: {
          select: {
            id: true, dnNo: true, dispatchDate: true,
            vehicleNo: true, lrNo: true,
          },
        },
        invoices: {
          select: { id: true, invoiceNo: true },
        },
      },
    });

    if (!so) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    // Flatten all inventory stocks from PO → GRN → GRNItem → InventoryStock
    const allStocks: any[] = [];
    for (const po of so.purchaseOrders) {
      for (const grn of po.goodsReceiptNotes) {
        for (const grnItem of grn.items) {
          for (const stock of grnItem.inventoryStocks) {
            allStocks.push(stock);
          }
        }
      }
    }

    // Flatten all MTC documents
    const allMTCs = so.purchaseOrders.flatMap((po) => po.mtcDocuments);

    // --- STAGE 1: PO Received ---
    const stage1: StageDetail = {
      name: "PO Received",
      status: "COMPLETED",
      details: `SO ${so.soNo} created for ${so.customer.name}`,
      items: [
        { label: "Sales Order", value: so.soNo, href: `/sales/${so.id}` },
        { label: "Customer PO", value: so.customerPoNo || "—" },
        { label: "Customer", value: so.customer.name },
      ],
    };

    // --- STAGE 2: PO Acceptance ---
    let stage2Status: StageStatus = "PENDING";
    let stage2Details = "PO acceptance pending";
    if (so.poAcceptanceStatus === "ACCEPTED") {
      stage2Status = "COMPLETED";
      stage2Details = "PO accepted and confirmed";
    } else if (so.poAcceptanceStatus === "HOLD") {
      stage2Status = "IN_PROGRESS";
      stage2Details = "PO acceptance under review";
    } else if (so.poAcceptanceStatus === "REJECTED") {
      stage2Status = "PENDING";
      stage2Details = "PO acceptance was rejected";
    }
    const stage2: StageDetail = {
      name: "PO Acceptance",
      status: stage2Status,
      details: stage2Details,
      items: [
        { label: "Acceptance Status", value: so.poAcceptanceStatus },
      ],
    };

    // --- STAGE 3: Material Preparation ---
    const pos = so.purchaseOrders;
    let stage3Status: StageStatus = "PENDING";
    let stage3Details = "No purchase orders created yet";
    if (pos.length > 0) {
      const totalGRNs = pos.reduce((sum, po) => sum + po.goodsReceiptNotes.length, 0);
      const allReceived = pos.every(
        (po) => po.status === "FULLY_RECEIVED" || po.status === "CLOSED"
      );
      if (allReceived) {
        stage3Status = "COMPLETED";
        stage3Details = `All ${pos.length} PO(s) fully received — ${totalGRNs} GRN(s)`;
      } else {
        stage3Status = "IN_PROGRESS";
        const receivedCount = pos.filter(
          (po) => po.status === "FULLY_RECEIVED" || po.status === "CLOSED"
        ).length;
        stage3Details = `${receivedCount}/${pos.length} PO(s) received — ${totalGRNs} GRN(s) created`;
      }
    }
    const stage3: StageDetail = {
      name: "Material Preparation",
      status: stage3Status,
      details: stage3Details,
      items: pos.map((po) => ({
        label: `PO ${po.poNo}`,
        value: `${po.status.replace(/_/g, " ")} — ${po.vendor.name}`,
        href: `/purchase/orders/${po.id}`,
      })),
    };

    // --- STAGE 4: Inspection ---
    const allInspections = allStocks.flatMap((s) => s.inspections);
    const allQCReleases = allStocks.flatMap((s) => s.qcReleases);
    let stage4Status: StageStatus = "PENDING";
    let stage4Details = "No inspections recorded";

    if (allStocks.length === 0 && pos.length === 0) {
      stage4Details = "Awaiting material receipt";
    } else if (allInspections.length > 0) {
      const passCount = allInspections.filter((i: any) => i.overallResult === "PASS").length;
      const failCount = allInspections.filter((i: any) => i.overallResult === "FAIL").length;
      const allPassed = allInspections.length > 0 && passCount === allInspections.length;

      if (allPassed && allQCReleases.length > 0) {
        stage4Status = "COMPLETED";
        stage4Details = `All ${allInspections.length} inspection(s) passed — ${allQCReleases.length} QC release(s)`;
      } else {
        stage4Status = "IN_PROGRESS";
        stage4Details = `${passCount} passed, ${failCount} failed out of ${allInspections.length} inspection(s)`;
      }
    } else if (allStocks.length > 0) {
      stage4Status = "PENDING";
      stage4Details = `${allStocks.length} stock item(s) awaiting inspection`;
    }

    const stage4: StageDetail = {
      name: "Inspection",
      status: stage4Status,
      details: stage4Details,
      items: allInspections.slice(0, 10).map((ins: any) => ({
        label: ins.inspectionNo,
        value: ins.overallResult,
        href: `/quality/inspections/${ins.id}`,
      })),
    };

    // --- STAGE 5: Lab Testing ---
    const allLabReports = allStocks.flatMap((s) => s.labReports);
    const allLabLetters = allStocks.flatMap((s) => s.labLetters);
    let stage5Status: StageStatus = "PENDING";
    let stage5Details = "No lab testing initiated";

    if (allLabReports.length > 0) {
      const completedReports = allLabReports.filter(
        (r: any) => r.result === "PASS" || r.result === "FAIL"
      );
      if (completedReports.length === allLabReports.length) {
        stage5Status = "COMPLETED";
        stage5Details = `${allLabReports.length} lab report(s) completed`;
      } else {
        stage5Status = "IN_PROGRESS";
        stage5Details = `${completedReports.length}/${allLabReports.length} lab report(s) completed`;
      }
    } else if (allLabLetters.length > 0) {
      stage5Status = "IN_PROGRESS";
      stage5Details = `${allLabLetters.length} lab letter(s) sent — awaiting reports`;
    } else if (stage4Status === "COMPLETED") {
      // Inspection done but no lab work — might not be required
      stage5Status = "COMPLETED";
      stage5Details = "Lab testing not required or completed via inspection";
    }

    const stage5: StageDetail = {
      name: "Lab Testing",
      status: stage5Status,
      details: stage5Details,
      items: [
        ...allLabLetters.slice(0, 5).map((ll: any) => ({
          label: `Letter ${ll.letterNo}`,
          value: ll.status,
        })),
        ...allLabReports.slice(0, 5).map((lr: any) => ({
          label: `Report ${lr.reportNo}`,
          value: `${lr.reportType} — ${lr.result || "PENDING"}`,
        })),
      ],
    };

    // --- STAGE 6: Documentation ---
    let stage6Status: StageStatus = "PENDING";
    let stage6Details = "No documentation uploaded";

    if (allMTCs.length > 0) {
      const verifiedCount = allMTCs.filter(
        (m: any) => m.verificationStatus === "VERIFIED"
      ).length;
      if (verifiedCount === allMTCs.length) {
        stage6Status = "COMPLETED";
        stage6Details = `All ${allMTCs.length} MTC(s) verified`;
      } else {
        stage6Status = "IN_PROGRESS";
        stage6Details = `${verifiedCount}/${allMTCs.length} MTC(s) verified`;
      }
    } else if (stage4Status === "COMPLETED") {
      // If inspection is done, documentation is at least in progress
      stage6Status = "IN_PROGRESS";
      stage6Details = "Inspection complete — documentation in progress";
    }

    const stage6: StageDetail = {
      name: "Documentation",
      status: stage6Status,
      details: stage6Details,
      items: allMTCs.slice(0, 10).map((m: any) => ({
        label: `MTC ${m.mtcNo}`,
        value: m.verificationStatus,
      })),
    };

    // --- STAGE 7: Dispatch Clearance ---
    let stage7Status: StageStatus = "PENDING";
    let stage7Details = "Dispatch not initiated";

    if (so.dispatchNotes.length > 0) {
      stage7Status = "COMPLETED";
      stage7Details = `${so.dispatchNotes.length} dispatch note(s) created`;
    } else if (so.packingLists.length > 0) {
      stage7Status = "IN_PROGRESS";
      stage7Details = `${so.packingLists.length} packing list(s) created — awaiting dispatch`;
    }

    const stage7: StageDetail = {
      name: "Dispatch Clearance",
      status: stage7Status,
      details: stage7Details,
      items: [
        ...so.packingLists.map((pl) => ({
          label: `PL ${pl.plNo}`,
          value: `${pl.items.length} item(s)`,
          href: `/dispatch?tab=packing-lists`,
        })),
        ...so.dispatchNotes.map((dn) => ({
          label: `DN ${dn.dnNo}`,
          value: dn.vehicleNo || "—",
          href: `/dispatch?tab=dispatch-notes`,
        })),
      ],
    };

    const stages = [stage1, stage2, stage3, stage4, stage5, stage6, stage7];
    const completionPercentage = computeCompletion(stages);

    // Item-level dispatch progress
    const itemProgress = so.items.map((item) => ({
      sNo: item.sNo,
      product: item.product,
      material: item.material,
      sizeLabel: item.sizeLabel,
      ordered: Number(item.quantity),
      dispatched: Number(item.qtyDispatched),
      status: item.itemStatus,
      dispatchPercentage:
        Number(item.quantity) > 0
          ? Math.round((Number(item.qtyDispatched) / Number(item.quantity)) * 100)
          : 0,
    }));

    return NextResponse.json({
      order: {
        id: so.id,
        soNo: so.soNo,
        soDate: so.soDate.toISOString(),
        customerPoNo: so.customerPoNo,
        customerName: so.customer.name,
        projectName: so.projectName,
        status: so.status,
      },
      stages,
      completionPercentage,
      itemProgress,
      summary: {
        totalPOs: pos.length,
        totalGRNs: pos.reduce((s, po) => s + po.goodsReceiptNotes.length, 0),
        totalInspections: allInspections.length,
        totalLabReports: allLabReports.length,
        totalMTCs: allMTCs.length,
        totalPackingLists: so.packingLists.length,
        totalDispatchNotes: so.dispatchNotes.length,
        totalInvoices: so.invoices.length,
      },
    });
  } catch (error) {
    console.error("Error fetching PO tracking detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
