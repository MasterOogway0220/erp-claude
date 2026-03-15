import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

/**
 * Auto-generate alerts by scanning relevant tables for overdue/approaching items.
 * Returns both persisted alerts and dynamically-generated ones.
 */
export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("alerts", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const severity = searchParams.get("severity") || "";

    const userRole = session.user?.role;
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    // ── Dynamic alert generation ──────────────────────────────────────
    const dynamicAlerts: any[] = [];
    const cFilter = companyFilter(companyId);

    // 1. Warehouse Intimations approaching/past requiredByDate
    const urgentMPRs = await prisma.warehouseIntimation.findMany({
      where: {
        ...cFilter,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        requiredByDate: { lte: threeDaysFromNow },
      },
      include: {
        salesOrder: { select: { soNo: true } },
      },
    });

    for (const mpr of urgentMPRs) {
      const isPast = mpr.requiredByDate && mpr.requiredByDate < now;
      dynamicAlerts.push({
        id: `mpr-${mpr.id}`,
        companyId: mpr.companyId,
        type: "MATERIAL_PREPARATION",
        title: `Material Preparation ${isPast ? "Overdue" : "Due Soon"}: ${mpr.mprNo}`,
        message: `Warehouse intimation ${mpr.mprNo} for SO ${mpr.salesOrder?.soNo || "N/A"} is ${isPast ? "past due" : "due within 3 days"}. Required by: ${mpr.requiredByDate ? mpr.requiredByDate.toISOString().split("T")[0] : "N/A"}.`,
        severity: isPast ? "CRITICAL" : "HIGH",
        status: "UNREAD",
        relatedModule: "warehouse",
        relatedId: mpr.id,
        dueDate: mpr.requiredByDate,
        assignedToRole: "STORES",
        createdAt: now,
        updatedAt: now,
        isDynamic: true,
      });
    }

    // 2. Inspections pending (stock under inspection for > 3 days)
    const pendingInspections = await prisma.inventoryStock.findMany({
      where: {
        ...cFilter,
        status: "UNDER_INSPECTION",
        createdAt: { lte: threeDaysAgo },
      },
      select: {
        id: true,
        companyId: true,
        heatNo: true,
        product: true,
        sizeLabel: true,
        createdAt: true,
      },
    });

    for (const stock of pendingInspections) {
      const daysOld = Math.floor((now.getTime() - stock.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      dynamicAlerts.push({
        id: `insp-${stock.id}`,
        companyId: stock.companyId,
        type: "INSPECTION_DUE",
        title: `Inspection Pending: ${stock.heatNo || "Unknown Heat"}`,
        message: `Stock item ${stock.product || ""} ${stock.sizeLabel || ""} (Heat: ${stock.heatNo || "N/A"}) has been under inspection for ${daysOld} days.`,
        severity: daysOld > 7 ? "CRITICAL" : daysOld > 5 ? "HIGH" : "MEDIUM",
        status: "UNREAD",
        relatedModule: "inventory",
        relatedId: stock.id,
        dueDate: null,
        assignedToRole: "QC",
        createdAt: now,
        updatedAt: now,
        isDynamic: true,
      });
    }

    // 3. Lab letters with status SENT/RESULTS_PENDING for > 5 days
    const pendingLabLetters = await prisma.labLetter.findMany({
      where: {
        ...cFilter,
        status: { in: ["SENT", "RESULTS_PENDING"] },
        updatedAt: { lte: fiveDaysAgo },
      },
      select: {
        id: true,
        companyId: true,
        letterNo: true,
        labName: true,
        heatNo: true,
        status: true,
        updatedAt: true,
      },
    });

    for (const lab of pendingLabLetters) {
      const daysOld = Math.floor((now.getTime() - lab.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
      dynamicAlerts.push({
        id: `lab-${lab.id}`,
        companyId: lab.companyId,
        type: "LAB_TESTING_PENDING",
        title: `Lab Results Pending: ${lab.letterNo}`,
        message: `Lab letter ${lab.letterNo} sent to ${lab.labName || "lab"} for Heat ${lab.heatNo || "N/A"} has been awaiting results for ${daysOld} days.`,
        severity: daysOld > 10 ? "CRITICAL" : daysOld > 7 ? "HIGH" : "MEDIUM",
        status: "UNREAD",
        relatedModule: "quality",
        relatedId: lab.id,
        dueDate: null,
        assignedToRole: "QC",
        createdAt: now,
        updatedAt: now,
        isDynamic: true,
      });
    }

    // 4. Sales order items with delivery deadline approaching (within 5 days, not fully dispatched)
    const upcomingDeliveries = await prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          ...cFilter,
          status: { in: ["OPEN", "PARTIALLY_DISPATCHED"] },
        },
        deliveryDate: {
          lte: fiveDaysFromNow,
          not: null,
        },
        itemStatus: { not: "DISPATCHED" },
      },
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            customer: { select: { name: true } },
            companyId: true,
          },
        },
      },
    });

    for (const item of upcomingDeliveries) {
      // Skip items that are already fully dispatched
      const remaining = Number(item.quantity) - Number(item.qtyDispatched);
      if (remaining <= 0) continue;

      const isPast = item.deliveryDate && item.deliveryDate < now;
      const daysUntil = item.deliveryDate
        ? Math.floor((item.deliveryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      dynamicAlerts.push({
        id: `del-${item.id}`,
        companyId: item.salesOrder.companyId,
        type: "DELIVERY_DEADLINE",
        title: `Delivery ${isPast ? "Overdue" : "Due Soon"}: ${item.salesOrder.soNo}`,
        message: `SO ${item.salesOrder.soNo} for ${item.salesOrder.customer?.name || "customer"} — ${item.product || "item"} ${item.sizeLabel || ""}: ${remaining} units remaining. ${isPast ? `Overdue by ${Math.abs(daysUntil)} days.` : `Due in ${daysUntil} days.`}`,
        severity: isPast ? "CRITICAL" : daysUntil <= 2 ? "HIGH" : "MEDIUM",
        status: "UNREAD",
        relatedModule: "sales",
        relatedId: item.salesOrder.id,
        dueDate: item.deliveryDate,
        assignedToRole: "SALES",
        createdAt: now,
        updatedAt: now,
        isDynamic: true,
      });
    }

    // ── Persisted alerts ──────────────────────────────────────────────
    const persistedWhere: any = { ...cFilter };
    if (status) persistedWhere.status = status;
    if (type) persistedWhere.type = type;
    if (severity) persistedWhere.severity = severity;

    const persistedAlerts = await prisma.alert.findMany({
      where: persistedWhere,
      orderBy: { createdAt: "desc" },
    });

    // ── Merge and filter ──────────────────────────────────────────────
    let allAlerts = [...dynamicAlerts, ...persistedAlerts];

    // Apply filters to dynamic alerts too
    if (status) {
      allAlerts = allAlerts.filter((a) => a.status === status);
    }
    if (type) {
      allAlerts = allAlerts.filter((a) => a.type === type);
    }
    if (severity) {
      allAlerts = allAlerts.filter((a) => a.severity === severity);
    }

    // Sort by severity (CRITICAL first) then by createdAt
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    allAlerts.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
        (severityOrder[b.severity as keyof typeof severityOrder] ?? 3);
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Summary stats
    const summary = {
      total: allAlerts.length,
      critical: allAlerts.filter((a) => a.severity === "CRITICAL").length,
      high: allAlerts.filter((a) => a.severity === "HIGH").length,
      medium: allAlerts.filter((a) => a.severity === "MEDIUM").length,
      low: allAlerts.filter((a) => a.severity === "LOW").length,
      unread: allAlerts.filter((a) => a.status === "UNREAD").length,
    };

    return NextResponse.json({ alerts: allAlerts, summary });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a persisted alert or bulk-update alert statuses
 */
export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("alerts", "write");
    if (!authorized) return response!;

    const body = await request.json();

    // Bulk update: { action: "markRead" | "dismiss", ids: string[] }
    if (body.action && body.ids) {
      const newStatus = body.action === "dismiss" ? "DISMISSED" : "READ";
      // Only update persisted alerts (dynamic ones start without "mpr-", "insp-", etc.)
      const persistedIds = (body.ids as string[]).filter(
        (id) => !id.startsWith("mpr-") && !id.startsWith("insp-") && !id.startsWith("lab-") && !id.startsWith("del-")
      );

      if (persistedIds.length > 0) {
        await prisma.alert.updateMany({
          where: { id: { in: persistedIds }, ...companyFilter(companyId) },
          data: { status: newStatus },
        });
      }

      return NextResponse.json({ success: true, updated: persistedIds.length });
    }

    // Create a new alert
    const alert = await prisma.alert.create({
      data: {
        companyId: companyId || undefined,
        type: body.type,
        title: body.title,
        message: body.message,
        severity: body.severity || "MEDIUM",
        relatedModule: body.relatedModule || null,
        relatedId: body.relatedId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedToRole: body.assignedToRole || null,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Error creating/updating alerts:", error);
    return NextResponse.json(
      { error: "Failed to process alert request" },
      { status: 500 }
    );
  }
}
