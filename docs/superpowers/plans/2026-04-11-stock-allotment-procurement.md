# Stock Allotment / Procurement Routing (3B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After order processing, let users route SO items to stock (warehouse) or procurement (purchase), with auto-analyze suggestions, auto-creation of MPR/PR, and live alerts in the notification bell.

**Architecture:** Allotment fields on SalesOrderItem track the routing decision. An analyze API checks stock availability. A confirm API applies the decision and auto-creates downstream records (WarehouseIntimation for stock, PurchaseRequisition for procurement). The order processing wizard gets an inline allotment section. A dedicated allotment page provides a full overview. The existing topbar bell is wired to the alerts API.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-11-stock-allotment-procurement-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/sales-orders/[id]/allotment/analyze/route.ts` | GET — analyze stock availability per item |
| `src/app/api/sales-orders/[id]/allotment/route.ts` | POST — confirm allotment, auto-create MPR/PR/alerts |
| `src/app/(dashboard)/sales/[id]/allotment/page.tsx` | Dedicated allotment page with table + bulk actions |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Allotment fields on SalesOrderItem/SalesOrder, new AlertType values |
| `src/app/(dashboard)/sales/[id]/process/page.tsx` | Add allotment section after item is processed |
| `src/app/(dashboard)/sales/[id]/page.tsx` | Add allotment status badge + Stock Allotment button |
| `src/components/layout/topbar.tsx` | Wire notification bell to alerts API with live data |

---

## Task 1: Schema — Allotment Fields + AlertType Extension

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add allotment fields to SalesOrderItem**

Find the `SalesOrderItem` model. Add after `itemStatus`:

```prisma
  allotmentSource       String?
  stockAllocQty         Decimal?  @db.Decimal(10, 3)
  procurementAllocQty   Decimal?  @db.Decimal(10, 3)
  allotmentStatus       String    @default("PENDING")
```

- [ ] **Step 2: Add allotmentStatus to SalesOrder**

Find the `SalesOrder` model. Add after `processingStatus`:

```prisma
  allotmentStatus       String    @default("PENDING")
```

- [ ] **Step 3: Add new AlertType values**

Find the `AlertType` enum (around line 268). Add two new values:

```prisma
enum AlertType {
  INSPECTION_DUE
  LAB_TESTING_PENDING
  DELIVERY_DEADLINE
  MATERIAL_PREPARATION
  STOCK_ALLOTMENT
  PROCUREMENT_REQUIRED
}
```

- [ ] **Step 4: Validate and push**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add allotment fields to SalesOrderItem/SalesOrder, extend AlertType enum"
```

---

## Task 2: API — Analyze Stock Availability

**Files:**
- Create: `src/app/api/sales-orders/[id]/allotment/analyze/route.ts`

- [ ] **Step 1: Create the analyze endpoint**

Create `src/app/api/sales-orders/[id]/allotment/analyze/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const cFilter = companyFilter(companyId);

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          where: itemId ? { id: itemId } : undefined,
          orderBy: { sNo: "asc" },
          include: {
            stockReservations: {
              where: { status: "RESERVED" },
              select: { reservedQtyMtr: true },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    const analysisItems = await Promise.all(
      salesOrder.items.map(async (item) => {
        const orderedQty = Number(item.quantity);
        const existingReservations = item.stockReservations.reduce(
          (sum, r) => sum + Number(r.reservedQtyMtr), 0
        );
        const remainingQty = orderedQty - existingReservations;

        // Find matching available stock
        const whereClause: any = {
          status: "ACCEPTED",
          quantityMtr: { gt: 0 },
          ...cFilter,
        };
        if (item.product) {
          whereClause.product = { contains: item.product };
        }
        if (item.sizeLabel) {
          whereClause.sizeLabel = item.sizeLabel;
        }
        if (item.material) {
          whereClause.specification = { contains: item.material };
        }

        const availableStockItems = await prisma.inventoryStock.findMany({
          where: whereClause,
          orderBy: { mtcDate: "asc" },
          select: {
            id: true,
            heatNo: true,
            product: true,
            specification: true,
            sizeLabel: true,
            quantityMtr: true,
            pieces: true,
            mtcDate: true,
            mtcNo: true,
            make: true,
          },
        });

        const availableStockQty = availableStockItems.reduce(
          (sum, s) => sum + Number(s.quantityMtr), 0
        );

        let suggestedSource: string;
        let suggestedStockQty: number;
        let suggestedProcurementQty: number;

        if (remainingQty <= 0) {
          suggestedSource = "STOCK";
          suggestedStockQty = 0;
          suggestedProcurementQty = 0;
        } else if (availableStockQty >= remainingQty) {
          suggestedSource = "STOCK";
          suggestedStockQty = remainingQty;
          suggestedProcurementQty = 0;
        } else if (availableStockQty > 0) {
          suggestedSource = "SPLIT";
          suggestedStockQty = Math.round(availableStockQty * 1000) / 1000;
          suggestedProcurementQty = Math.round((remainingQty - availableStockQty) * 1000) / 1000;
        } else {
          suggestedSource = "PROCUREMENT";
          suggestedStockQty = 0;
          suggestedProcurementQty = remainingQty;
        }

        return {
          salesOrderItemId: item.id,
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          sizeLabel: item.sizeLabel,
          orderedQty,
          existingReservations,
          remainingQty,
          availableStockQty: Math.round(availableStockQty * 1000) / 1000,
          availableStockItems: availableStockItems.map((s) => ({
            ...s,
            quantityMtr: Number(s.quantityMtr),
          })),
          suggestedSource,
          suggestedStockQty,
          suggestedProcurementQty,
          currentAllotment: item.allotmentSource
            ? {
                source: item.allotmentSource,
                stockQty: item.stockAllocQty ? Number(item.stockAllocQty) : 0,
                procurementQty: item.procurementAllocQty ? Number(item.procurementAllocQty) : 0,
                status: item.allotmentStatus,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ items: analysisItems });
  } catch (error) {
    console.error("Error analyzing allotment:", error);
    return NextResponse.json({ error: "Failed to analyze stock availability" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/\[id\]/allotment/
git commit -m "feat: add stock availability analysis API for allotment"
```

---

## Task 3: API — Confirm Allotment (Auto-Create MPR/PR/Alerts)

**Files:**
- Create: `src/app/api/sales-orders/[id]/allotment/route.ts`

- [ ] **Step 1: Create the confirm allotment endpoint**

Create `src/app/api/sales-orders/[id]/allotment/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/\[id\]/allotment/route.ts
git commit -m "feat: add allotment confirmation API with auto-create MPR, PR, and alerts"
```

---

## Task 4: Topbar — Wire Notification Bell to Alerts API

**Files:**
- Modify: `src/components/layout/topbar.tsx`

- [ ] **Step 1: Add alerts state and fetch logic**

Add state after existing state variables:
```typescript
const [alerts, setAlerts] = useState<any[]>([]);
const [alertCount, setAlertCount] = useState(0);
```

Add fetch function:
```typescript
const fetchAlerts = async () => {
  try {
    const res = await fetch("/api/alerts?status=UNREAD&limit=10");
    if (res.ok) {
      const data = await res.json();
      const alertList = data.alerts || data || [];
      setAlerts(Array.isArray(alertList) ? alertList.slice(0, 10) : []);
      setAlertCount(Array.isArray(alertList) ? alertList.length : 0);
    }
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
  }
};
```

Add useEffect to poll alerts:
```typescript
useEffect(() => {
  fetchAlerts();
  const interval = setInterval(fetchAlerts, 60000); // refresh every minute
  return () => clearInterval(interval);
}, []);
```

Add mark-as-read function:
```typescript
const markAlertRead = async (alertId: string) => {
  try {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", ids: [alertId] }),
    });
    fetchAlerts();
  } catch (error) {
    console.error("Failed to mark alert read:", error);
  }
};

const markAllRead = async () => {
  try {
    const ids = alerts.map((a) => a.id).filter(Boolean);
    if (ids.length === 0) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", ids }),
    });
    fetchAlerts();
  } catch (error) {
    console.error("Failed to mark all read:", error);
  }
};
```

- [ ] **Step 2: Replace the static bell dropdown with live data**

Find the notification bell section (around lines 205-226). Replace the entire `<DropdownMenu>` block with:

```tsx
{/* Notification bell */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {alertCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
          {alertCount > 9 ? "9+" : alertCount}
        </span>
      )}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-80 mt-1">
    <div className="flex items-center justify-between px-3 py-2">
      <span className="font-semibold text-sm">Notifications</span>
      {alertCount > 0 && (
        <button
          onClick={markAllRead}
          className="text-xs text-blue-600 hover:underline"
        >
          Mark all read
        </button>
      )}
    </div>
    <DropdownMenuSeparator />
    {alerts.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No new notifications</p>
        <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up</p>
      </div>
    ) : (
      <div className="max-h-[300px] overflow-y-auto">
        {alerts.map((alert) => (
          <DropdownMenuItem
            key={alert.id}
            className="flex flex-col items-start gap-1 p-3 cursor-pointer"
            onClick={() => {
              markAlertRead(alert.id);
              if (alert.relatedModule && alert.relatedId) {
                const routes: Record<string, string> = {
                  WarehouseIntimation: "/warehouse/intimation",
                  PurchaseRequisition: "/purchase/requisitions",
                  SalesOrder: "/sales",
                };
                const base = routes[alert.relatedModule] || "";
                if (base) window.location.href = `${base}/${alert.relatedId}`;
              }
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                alert.severity === "CRITICAL" ? "bg-red-500" :
                alert.severity === "HIGH" ? "bg-orange-500" :
                alert.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
              }`} />
              <span className="text-sm font-medium truncate flex-1">{alert.title}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{alert.message}</p>
            <span className="text-[10px] text-muted-foreground/60 pl-4">
              {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </DropdownMenuItem>
        ))}
      </div>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/topbar.tsx
git commit -m "feat: wire notification bell to alerts API with live unread count and dropdown"
```

---

## Task 5: Dedicated Allotment Page

**Files:**
- Create: `src/app/(dashboard)/sales/[id]/allotment/page.tsx`

- [ ] **Step 1: Create the allotment page**

This page shows all SO items with their stock availability and allotment status.

The page should:

**Imports:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Warehouse, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
```

**Interfaces:**
```typescript
interface AnalysisItem {
  salesOrderItemId: string;
  sNo: number;
  product: string | null;
  material: string | null;
  sizeLabel: string | null;
  orderedQty: number;
  existingReservations: number;
  remainingQty: number;
  availableStockQty: number;
  suggestedSource: string;
  suggestedStockQty: number;
  suggestedProcurementQty: number;
  currentAllotment: {
    source: string;
    stockQty: number;
    procurementQty: number;
    status: string;
  } | null;
}

interface AllotmentFormItem {
  salesOrderItemId: string;
  source: string; // "STOCK" | "PROCUREMENT" | "SPLIT"
  stockAllocQty: number;
  procurementAllocQty: number;
}
```

**State:**
- `analysisItems: AnalysisItem[]`
- `formItems: Map<string, AllotmentFormItem>` (keyed by salesOrderItemId)
- `soInfo: { soNo, allotmentStatus, customerName }` (fetched alongside analysis)
- `loading, submitting: boolean`
- `editingItemId: string | null` (which item's allotment is being edited)

**Key functions:**
- `fetchAnalysis()` — GET `/api/sales-orders/${id}/allotment/analyze`, populate analysisItems
- `initFormItem(item: AnalysisItem)` — creates form entry from suggestion or current allotment
- `handleSourceChange(itemId, source)` — update form item source, auto-calculate qtys
- `confirmSingleItem(itemId)` — POST `/api/sales-orders/${id}/allotment` with just that one item
- `autoAllocateAll()` — apply suggestions for all pending items, then POST all at once

**Layout:**
1. **PageHeader:** "Stock Allotment — {soNo}", with Back button
2. **Summary cards (4):** Total Items | Allocated to Stock | Allocated to Procurement | Pending
3. **"Auto-Allocate All Pending" button** — runs suggestions for all pending items
4. **Items table:**
   - Columns: #, Product, Size, Ordered Qty, Available Stock, Source (badge/select), Stock Qty, Procurement Qty, Status, Action
   - If item is already ALLOCATED: show read-only row with "Change" button
   - If item is PENDING or being edited: show editable row with Source select + qty inputs + "Confirm" button
   - Source select: STOCK (disabled if no stock available), PROCUREMENT, SPLIT (disabled if no stock available)
   - When Source changes: auto-fill quantities (STOCK: all to stock, PROCUREMENT: all to procurement, SPLIT: available to stock, remainder to procurement)

After creating, verify with `npx tsc --noEmit 2>&1 | head -20`.

Commit with: `feat: add dedicated stock allotment page with analysis and bulk allocation`

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/sales/\[id\]/allotment/
git commit -m "feat: add dedicated stock allotment page with analysis and bulk allocation"
```

---

## Task 6: Wizard Integration — Allotment Section After Processed

**Files:**
- Modify: `src/app/(dashboard)/sales/[id]/process/page.tsx`

- [ ] **Step 1: Add allotment state**

Add state variables:
```typescript
const [allotmentAnalysis, setAllotmentAnalysis] = useState<any>(null);
const [allotmentSource, setAllotmentSource] = useState<string>("");
const [allotmentStockQty, setAllotmentStockQty] = useState<string>("");
const [allotmentProcQty, setAllotmentProcQty] = useState<string>("");
const [allottingItem, setAllottingItem] = useState(false);
const [allotmentConfirmed, setAllotmentConfirmed] = useState(false);
```

- [ ] **Step 2: Add fetchAllotmentAnalysis function**

```typescript
const fetchAllotmentAnalysis = async (itemId: string) => {
  try {
    const res = await fetch(`/api/sales-orders/${id}/allotment/analyze?itemId=${itemId}`);
    if (res.ok) {
      const data = await res.json();
      const analysis = data.items?.[0];
      if (analysis) {
        setAllotmentAnalysis(analysis);
        setAllotmentSource(analysis.currentAllotment?.source || analysis.suggestedSource);
        if (analysis.currentAllotment) {
          setAllotmentStockQty(String(analysis.currentAllotment.stockQty || 0));
          setAllotmentProcQty(String(analysis.currentAllotment.procurementQty || 0));
          setAllotmentConfirmed(true);
        } else {
          setAllotmentStockQty(String(analysis.suggestedStockQty));
          setAllotmentProcQty(String(analysis.suggestedProcurementQty));
          setAllotmentConfirmed(false);
        }
      }
    }
  } catch (error) {
    console.error("Failed to analyze allotment:", error);
  }
};
```

- [ ] **Step 3: Add confirmAllotment function**

```typescript
const confirmAllotment = async () => {
  if (!allotmentAnalysis) return;
  const stockQty = parseFloat(allotmentStockQty) || 0;
  const procQty = parseFloat(allotmentProcQty) || 0;

  setAllottingItem(true);
  try {
    const res = await fetch(`/api/sales-orders/${id}/allotment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          salesOrderItemId: allotmentAnalysis.salesOrderItemId,
          source: allotmentSource,
          stockAllocQty: stockQty,
          procurementAllocQty: procQty,
        }],
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Allotment confirmed${data.mprNo ? ` — MPR ${data.mprNo} created` : ""}${data.prNo ? ` — PR ${data.prNo} created` : ""}`);
      setAllotmentConfirmed(true);
      fetchProcessingData();
    } else {
      toast.error(data.error || "Failed to confirm allotment");
    }
  } catch (error) {
    toast.error("Failed to confirm allotment");
  } finally {
    setAllottingItem(false);
  }
};
```

- [ ] **Step 4: Call fetchAllotmentAnalysis when item is processed**

In the `markProcessed` function, after the successful PATCH response, add:
```typescript
// Auto-fetch allotment analysis after marking processed
fetchAllotmentAnalysis(items[currentIndex].salesOrderItem.id);
```

Also in `loadItemForm`, if the item is already processed, fetch analysis:
```typescript
if (items[index].processing?.status === "PROCESSED") {
  fetchAllotmentAnalysis(items[index].salesOrderItem.id);
} else {
  setAllotmentAnalysis(null);
  setAllotmentConfirmed(false);
}
```

- [ ] **Step 5: Add allotment section UI**

After the form Card (the main processing form), and before the footer buttons, add:

```tsx
{/* Allotment Section — shown when item is processed */}
{items[currentIndex]?.processing?.status === "PROCESSED" && allotmentAnalysis && (
  <Card className={allotmentConfirmed ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Warehouse className="w-4 h-4" />
        Stock Allotment
        {allotmentConfirmed && <Badge variant="default" className="text-xs">Allocated</Badge>}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span>Ordered: <strong>{allotmentAnalysis.orderedQty} MTR</strong></span>
        <span>Available Stock: <strong className={allotmentAnalysis.availableStockQty > 0 ? "text-green-600" : "text-red-600"}>
          {allotmentAnalysis.availableStockQty} MTR
        </strong></span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Source</Label>
          <Select
            value={allotmentSource}
            onValueChange={(val) => {
              setAllotmentSource(val);
              const qty = allotmentAnalysis.remainingQty;
              const avail = allotmentAnalysis.availableStockQty;
              if (val === "STOCK") {
                setAllotmentStockQty(String(qty));
                setAllotmentProcQty("0");
              } else if (val === "PROCUREMENT") {
                setAllotmentStockQty("0");
                setAllotmentProcQty(String(qty));
              } else {
                setAllotmentStockQty(String(Math.min(avail, qty)));
                setAllotmentProcQty(String(Math.max(0, qty - avail)));
              }
            }}
            disabled={allotmentConfirmed}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STOCK" disabled={allotmentAnalysis.availableStockQty <= 0}>Stock</SelectItem>
              <SelectItem value="PROCUREMENT">Procurement</SelectItem>
              <SelectItem value="SPLIT" disabled={allotmentAnalysis.availableStockQty <= 0}>Split</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Stock Qty (MTR)</Label>
          <Input
            type="number"
            value={allotmentStockQty}
            onChange={(e) => setAllotmentStockQty(e.target.value)}
            disabled={allotmentConfirmed || allotmentSource === "PROCUREMENT"}
            min={0}
            step={0.001}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Procurement Qty (MTR)</Label>
          <Input
            type="number"
            value={allotmentProcQty}
            onChange={(e) => setAllotmentProcQty(e.target.value)}
            disabled={allotmentConfirmed || allotmentSource === "STOCK"}
            min={0}
            step={0.001}
          />
        </div>
      </div>

      {!allotmentConfirmed ? (
        <Button onClick={confirmAllotment} disabled={allottingItem} className="w-full">
          {allottingItem ? "Allocating..." : "Confirm Allotment"}
        </Button>
      ) : (
        <div className="text-sm text-green-700 text-center">
          Allotment confirmed — {allotmentSource === "STOCK" ? "Warehouse notified" : allotmentSource === "PROCUREMENT" ? "Purchase Requisition created" : "Warehouse notified + PR created"}
        </div>
      )}
    </CardContent>
  </Card>
)}
```

Add `Warehouse` to the lucide-react imports if not already present.

- [ ] **Step 6: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/sales/\[id\]/process/page.tsx
git commit -m "feat: add inline allotment section in order processing wizard after marking processed"
```

---

## Task 7: SO Detail Page — Allotment Status Badge + Button

**Files:**
- Modify: `src/app/(dashboard)/sales/[id]/page.tsx`

- [ ] **Step 1: Add allotmentStatus to interface**

In the SalesOrder interface, add:
```typescript
  allotmentStatus: string;
```

- [ ] **Step 2: Add allotment status badge**

Next to the existing processing status badge, add:
```tsx
{salesOrder.allotmentStatus && salesOrder.allotmentStatus !== "PENDING" && (
  <Badge
    variant={
      salesOrder.allotmentStatus === "COMPLETED" ? "default" :
      salesOrder.allotmentStatus === "IN_PROGRESS" ? "outline" : "secondary"
    }
  >
    {salesOrder.allotmentStatus === "COMPLETED" ? "Allotted" :
     salesOrder.allotmentStatus === "IN_PROGRESS" ? "Partially Allotted" : ""}
  </Badge>
)}
```

- [ ] **Step 3: Add "Stock Allotment" button**

In the header buttons, after the "Process Order" button, add:
```tsx
{salesOrder.status === "OPEN" && (salesOrder.processingStatus === "PROCESSING" || salesOrder.processingStatus === "PROCESSED") && (
  <Button variant="outline" onClick={() => router.push(`/sales/${id}/allotment`)}>
    <Warehouse className="w-4 h-4 mr-2" />
    Stock Allotment
  </Button>
)}
```

Add `Warehouse` to the lucide-react imports.

- [ ] **Step 4: Add allotment info to processing summary**

In the Order Processing Summary card, update each item row to also show allotment info:
```tsx
{item.allotmentSource && (
  <Badge variant="outline" className="text-xs">
    {item.allotmentSource === "STOCK" ? "Stock" :
     item.allotmentSource === "PROCUREMENT" ? "Procurement" : "Split"}
  </Badge>
)}
```

This requires fetching allotment data. The processing items already come from `/api/sales-orders/${id}/processing`. The SO item data returned includes the allotment fields since they're on SalesOrderItem. Just add `allotmentSource`, `stockAllocQty`, `procurementAllocQty`, `allotmentStatus` to the processingItems mapping.

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/sales/\[id\]/page.tsx
git commit -m "feat: add allotment status badge and Stock Allotment button to SO detail page"
```

---

## Task 8: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build check**

```bash
npx next build 2>&1 | tail -15
```

Expected: Build succeeds with `/sales/[id]/allotment` in output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
