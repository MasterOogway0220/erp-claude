import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: true,
        customer: { select: { name: true } },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    const stockItems: any[] = [];
    const procurementItems: any[] = [];

    // Validate and update each item
    for (const allotment of items) {
      const soItem = salesOrder.items.find((i) => i.id === allotment.salesOrderItemId);
      if (!soItem) {
        return NextResponse.json(
          { error: `Item ${allotment.salesOrderItemId} not found in this SO` },
          { status: 400 }
        );
      }

      const orderedQty = Number(soItem.quantity);
      const stockQty = parseFloat(allotment.stockAllocQty || 0);
      const procQty = parseFloat(allotment.procurementAllocQty || 0);

      if (allotment.source === "STOCK" && stockQty <= 0) {
        return NextResponse.json({ error: `Stock quantity must be positive for STOCK allotment` }, { status: 400 });
      }
      if (allotment.source === "PROCUREMENT" && procQty <= 0) {
        return NextResponse.json({ error: `Procurement quantity must be positive for PROCUREMENT allotment` }, { status: 400 });
      }
      if (allotment.source === "SPLIT" && (stockQty <= 0 || procQty <= 0)) {
        return NextResponse.json({ error: `Both stock and procurement quantities must be positive for SPLIT allotment` }, { status: 400 });
      }

      // Validate total matches ordered qty (with small tolerance for rounding)
      const totalAlloc = stockQty + procQty;
      if (Math.abs(totalAlloc - orderedQty) > 0.01) {
        return NextResponse.json(
          { error: `Allotment total (${totalAlloc}) must equal ordered qty (${orderedQty}) for item #${soItem.sNo}` },
          { status: 400 }
        );
      }

      // Update SO item
      await prisma.salesOrderItem.update({
        where: { id: soItem.id },
        data: {
          allotmentSource: allotment.source,
          stockAllocQty: stockQty > 0 ? stockQty : null,
          procurementAllocQty: procQty > 0 ? procQty : null,
          allotmentStatus: "ALLOCATED",
        },
      });

      if (stockQty > 0) {
        stockItems.push({
          salesOrderItemId: soItem.id,
          sNo: soItem.sNo,
          product: soItem.product,
          material: soItem.material,
          sizeLabel: soItem.sizeLabel,
          additionalSpec: soItem.additionalSpec,
          requiredQty: stockQty,
        });
      }

      if (procQty > 0) {
        procurementItems.push({
          sNo: soItem.sNo,
          product: soItem.product,
          material: soItem.material,
          sizeLabel: soItem.sizeLabel,
          additionalSpec: soItem.additionalSpec,
          quantity: procQty,
          uom: "MTR",
          remarks: `For SO ${salesOrder.soNo}`,
        });
      }
    }

    // Auto-create Warehouse Intimation for stock items
    let mprNo: string | null = null;
    if (stockItems.length > 0) {
      const mprDocNo = await generateDocumentNumber("WAREHOUSE_INTIMATION", companyId);
      const mpr = await prisma.warehouseIntimation.create({
        data: {
          companyId,
          mprNo: mprDocNo,
          salesOrderId: id,
          priority: "NORMAL",
          status: "PENDING",
          remarks: `Auto-generated from stock allotment for ${salesOrder.soNo}`,
          createdById: session.user.id,
          items: {
            create: stockItems.map((item, idx) => ({
              sNo: idx + 1,
              salesOrderItemId: item.salesOrderItemId,
              product: item.product,
              material: item.material,
              sizeLabel: item.sizeLabel,
              additionalSpec: item.additionalSpec,
              requiredQty: item.requiredQty,
            })),
          },
        },
      });
      mprNo = mprDocNo;

      // Create alert for warehouse team
      await prisma.alert.create({
        data: {
          companyId: companyId!,
          type: "STOCK_ALLOTMENT",
          title: `Stock Allotment: ${salesOrder.soNo}`,
          message: `${stockItems.length} item(s) allocated from stock for ${salesOrder.customer.name}. MPR ${mprDocNo} created — pending warehouse processing.`,
          severity: "MEDIUM",
          status: "UNREAD",
          relatedModule: "WarehouseIntimation",
          relatedId: mpr.id,
          assignedToRole: "STORES",
        },
      });
    }

    // Auto-create Purchase Requisition for procurement items
    let prNo: string | null = null;
    if (procurementItems.length > 0) {
      const prDocNo = await generateDocumentNumber("PURCHASE_REQUISITION", companyId);
      const requiredByDate = new Date();
      requiredByDate.setDate(requiredByDate.getDate() + 45);

      const pr = await prisma.purchaseRequisition.create({
        data: {
          companyId,
          prNo: prDocNo,
          salesOrderId: id,
          requiredByDate,
          requisitionType: "AGAINST_SO",
          status: "DRAFT",
          requestedById: session.user.id,
          items: {
            create: procurementItems.map((item, idx) => ({
              sNo: idx + 1,
              product: item.product,
              material: item.material,
              sizeLabel: item.sizeLabel,
              additionalSpec: item.additionalSpec,
              quantity: item.quantity,
              uom: item.uom,
              remarks: item.remarks,
            })),
          },
        },
      });
      prNo = prDocNo;

      // Create alert for purchase team
      await prisma.alert.create({
        data: {
          companyId: companyId!,
          type: "PROCUREMENT_REQUIRED",
          title: `Procurement Required: ${salesOrder.soNo}`,
          message: `${procurementItems.length} item(s) need procurement for ${salesOrder.customer.name}. PR ${prDocNo} created — pending approval.`,
          severity: "HIGH",
          status: "UNREAD",
          relatedModule: "PurchaseRequisition",
          relatedId: pr.id,
          assignedToRole: "PURCHASE",
        },
      });
    }

    // Update SO allotment status
    const allSOItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
    });
    const allocatedCount = allSOItems.filter((i) => i.allotmentStatus === "ALLOCATED").length;
    let soAllotmentStatus = "PENDING";
    if (allocatedCount === allSOItems.length) {
      soAllotmentStatus = "COMPLETED";
    } else if (allocatedCount > 0) {
      soAllotmentStatus = "IN_PROGRESS";
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { allotmentStatus: soAllotmentStatus },
    });

    // Audit log
    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "UPDATE",
      tableName: "SalesOrder",
      recordId: id,
      newValue: JSON.stringify({
        action: "STOCK_ALLOTMENT",
        stockItems: stockItems.length,
        procurementItems: procurementItems.length,
        mprNo,
        prNo,
      }),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      allotmentStatus: soAllotmentStatus,
      mprNo,
      prNo,
      stockItemCount: stockItems.length,
      procurementItemCount: procurementItems.length,
    });
  } catch (error) {
    console.error("Error confirming allotment:", error);
    return NextResponse.json({ error: "Failed to confirm allotment" }, { status: 500 });
  }
}
