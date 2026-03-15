import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export type StageStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

export interface TrackingSummary {
  id: string;
  soNo: string;
  soDate: string;
  customerPoNo: string | null;
  customerName: string;
  projectName: string | null;
  status: string;
  poAcceptanceStatus: string;
  stages: { name: string; status: StageStatus }[];
  completionPercentage: number;
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

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";

    const where: any = {
      ...companyFilter(companyId),
      status: { not: "CANCELLED" },
    };

    if (search) {
      where.OR = [
        { soNo: { contains: search } },
        { customerPoNo: { contains: search } },
        { projectName: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      select: {
        id: true,
        soNo: true,
        soDate: true,
        customerPoNo: true,
        projectName: true,
        status: true,
        poAcceptanceStatus: true,
        customer: { select: { name: true } },
        _count: {
          select: {
            purchaseOrders: true,
            packingLists: true,
            dispatchNotes: true,
            invoices: true,
          },
        },
        // Check PO statuses for material preparation stage
        purchaseOrders: {
          select: {
            id: true,
            status: true,
            _count: {
              select: { goodsReceiptNotes: true, labReports: true },
            },
            labReports: {
              select: { id: true, result: true },
            },
          },
        },
      },
      orderBy: { soDate: "desc" },
      take: 100,
    });

    // Batch-query lab letter counts per SO via inventoryStock → grnItem → grn → purchaseOrder → salesOrderId
    const soIds = salesOrders.map((so) => so.id);
    const labLetterCounts = await prisma.labLetter.groupBy({
      by: ["inventoryStockId"],
      where: {
        inventoryStock: {
          grnItem: {
            grn: {
              purchaseOrder: {
                salesOrderId: { in: soIds },
              },
            },
          },
        },
      },
      _count: true,
    });

    // Build a map of salesOrderId → lab letter count
    // We need to resolve inventoryStockId → salesOrderId
    const labLetterStockIds = labLetterCounts
      .map((c) => c.inventoryStockId)
      .filter((id): id is string => id !== null);

    let labLettersBySOMap: Record<string, number> = {};
    if (labLetterStockIds.length > 0) {
      const stockToSO = await prisma.inventoryStock.findMany({
        where: { id: { in: labLetterStockIds } },
        select: {
          id: true,
          grnItem: {
            select: {
              grn: {
                select: {
                  purchaseOrder: {
                    select: { salesOrderId: true },
                  },
                },
              },
            },
          },
        },
      });
      for (const stock of stockToSO) {
        const soId = stock.grnItem?.grn?.purchaseOrder?.salesOrderId;
        if (soId) {
          const count = labLetterCounts.find((c) => c.inventoryStockId === stock.id)?._count ?? 0;
          labLettersBySOMap[soId] = (labLettersBySOMap[soId] || 0) + count;
        }
      }
    }

    const results: TrackingSummary[] = salesOrders.map((so) => {
      // Stage 1: PO Received — always completed once SO exists
      const poReceived: StageStatus = "COMPLETED";

      // Stage 2: PO Acceptance
      let poAcceptance: StageStatus = "PENDING";
      if (so.poAcceptanceStatus === "ACCEPTED") poAcceptance = "COMPLETED";
      else if (so.poAcceptanceStatus === "HOLD") poAcceptance = "IN_PROGRESS";

      // Stage 3: Material Preparation (POs created + GRN received)
      let materialPrep: StageStatus = "PENDING";
      if (so.purchaseOrders.length > 0) {
        const allReceived = so.purchaseOrders.every(
          (po) => po.status === "FULLY_RECEIVED" || po.status === "CLOSED"
        );
        if (allReceived) materialPrep = "COMPLETED";
        else materialPrep = "IN_PROGRESS"; // POs exist (with or without GRN)
      }

      // Stage 4-6: Use actual data where available, approximate for others
      const hasPackingList = so._count.packingLists > 0;
      const hasDispatch = so._count.dispatchNotes > 0;

      // Collect all lab reports across this SO's purchase orders
      const allLabReports = so.purchaseOrders.flatMap((po) => po.labReports);
      const totalLabReports = allLabReports.length;
      const labReportsWithResult = allLabReports.filter(
        (lr) => lr.result === "PASS" || lr.result === "FAIL"
      ).length;
      const hasLabLetters = (labLettersBySOMap[so.id] || 0) > 0;

      let inspection: StageStatus = "PENDING";
      let documentation: StageStatus = "PENDING";

      if (hasDispatch) {
        inspection = "COMPLETED";
        documentation = "COMPLETED";
      } else if (hasPackingList) {
        inspection = "COMPLETED";
        documentation = "IN_PROGRESS";
      } else if (materialPrep === "COMPLETED") {
        inspection = "IN_PROGRESS";
      }

      // Stage 5: Lab Testing — determined from actual lab report data
      let labTesting: StageStatus = "PENDING";
      if (totalLabReports > 0 && labReportsWithResult === totalLabReports) {
        // All lab reports have results (PASS/FAIL)
        labTesting = "COMPLETED";
      } else if (totalLabReports > 0) {
        // Some lab reports exist but not all have results yet
        labTesting = "IN_PROGRESS";
      } else if (hasLabLetters) {
        // Lab letters sent but no lab reports received yet
        labTesting = "IN_PROGRESS";
      }

      // Stage 7: Dispatch Clearance
      let dispatch: StageStatus = "PENDING";
      if (hasDispatch) dispatch = "COMPLETED";
      else if (hasPackingList) dispatch = "IN_PROGRESS";

      const stages = [
        { name: "PO Received", status: poReceived },
        { name: "PO Acceptance", status: poAcceptance },
        { name: "Material Preparation", status: materialPrep },
        { name: "Inspection", status: inspection },
        { name: "Lab Testing", status: labTesting },
        { name: "Documentation", status: documentation },
        { name: "Dispatch Clearance", status: dispatch },
      ];

      return {
        id: so.id,
        soNo: so.soNo,
        soDate: so.soDate.toISOString(),
        customerPoNo: so.customerPoNo,
        customerName: so.customer.name,
        projectName: so.projectName,
        status: so.status,
        poAcceptanceStatus: so.poAcceptanceStatus,
        stages,
        completionPercentage: computeCompletion(stages),
      };
    });

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error("Error fetching PO tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch PO tracking data" },
      { status: 500 }
    );
  }
}
