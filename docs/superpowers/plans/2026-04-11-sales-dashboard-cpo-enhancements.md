# Sales Dashboard & Client PO Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sales Dashboard page with KPIs, replace the delivery schedule text field with date pickers (PO-level + item-level), add rate negotiation with revision history, and reorder the sidebar navigation.

**Architecture:** New dashboard page fetches aggregated KPIs from a single API endpoint. Client PO form is enhanced with date pickers and inline rate editing. A new `RateRevision` Prisma model tracks all rate changes. Bulk rate operations get their own API endpoint.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui components, Tailwind CSS, date-fns

**Spec:** `docs/superpowers/specs/2026-04-11-sales-dashboard-cpo-enhancements-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/sales/dashboard/page.tsx` | Sales Dashboard page with KPI cards, deliveries, top customers, recent CPOs |
| `src/app/api/sales/dashboard/route.ts` | Dashboard aggregation API — single endpoint returning all KPIs |
| `src/app/api/client-purchase-orders/[id]/rate-revisions/route.ts` | GET rate revision history for a CPO item, POST bulk rate update |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `RateRevision` model, add `deliveryDate` to `ClientPurchaseOrder`, add reverse relations |
| `src/app/(dashboard)/client-purchase-orders/create/page.tsx` | Replace `deliverySchedule` text input with date picker, add item-level delivery date column, add inline rate edit with remark, add bulk rate negotiation section |
| `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx` | Display delivery dates, show rate revision history per item, show negotiation summary |
| `src/app/api/client-purchase-orders/route.ts` | Accept `deliveryDate` in POST, handle rate remarks |
| `src/app/api/client-purchase-orders/[id]/route.ts` | Add PATCH handler, include `rateRevisions` in GET response |
| `src/components/layout/sidebar.tsx` | Add Dashboard as first item under Sales, reorder nav items |

---

## Task 1: Prisma Schema — Add RateRevision Model & deliveryDate Fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add deliveryDate to ClientPurchaseOrder model**

In `prisma/schema.prisma`, find the `ClientPurchaseOrder` model and add `deliveryDate` after the `deliverySchedule` field:

```prisma
  deliverySchedule  String?
  deliveryDate      DateTime?
```

- [ ] **Step 2: Add the RateRevision model**

Add at the end of `prisma/schema.prisma`, before the closing of the file:

```prisma
model RateRevision {
  id              String        @id @default(cuid())
  clientPOItemId  String
  clientPOItem    ClientPOItem  @relation(fields: [clientPOItemId], references: [id], onDelete: Cascade)
  oldRate         Decimal       @db.Decimal(12, 2)
  newRate         Decimal       @db.Decimal(12, 2)
  remark          String
  overallRemark   String?
  changedById     String
  changedBy       User          @relation("RateRevisionChangedBy", fields: [changedById], references: [id])
  changedAt       DateTime      @default(now())
  companyId       String
  company         CompanyMaster @relation(fields: [companyId], references: [id])

  @@index([clientPOItemId])
  @@index([companyId])
}
```

- [ ] **Step 3: Add reverse relations**

In the `ClientPOItem` model, add:
```prisma
  rateRevisions   RateRevision[]
```

In the `User` model, add:
```prisma
  rateRevisions     RateRevision[]  @relation("RateRevisionChangedBy")
```

In the `CompanyMaster` model, add:
```prisma
  rateRevisions     RateRevision[]
```

- [ ] **Step 4: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name add-rate-revision-and-delivery-date
```

Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 5: Verify schema**

Run:
```bash
npx prisma validate
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add RateRevision model and deliveryDate field to ClientPurchaseOrder"
```

---

## Task 2: Sidebar Navigation — Add Dashboard, Reorder Items

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (lines 119-132)

- [ ] **Step 1: Update Sales nav children**

Find the Sales section in `sidebar.tsx` (around line 119). Replace the `children` array:

```typescript
children: [
  { title: "Dashboard", href: "/sales/dashboard" },
  { title: "Register Client P.O.", href: "/client-purchase-orders/create" },
  { title: "Client P.O. Register", href: "/client-purchase-orders" },
  { title: "P.O. Acceptance", href: "/po-acceptance" },
  { title: "Sales Orders", href: "/sales" },
  { title: "Order Tracking", href: "/po-tracking" },
  { title: "Customer PO Review", href: "/sales" },
],
```

- [ ] **Step 2: Verify sidebar renders**

Run:
```bash
npx next build --no-lint 2>&1 | tail -5
```

Expected: Build succeeds (the dashboard page doesn't exist yet, but the link is just an anchor).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Dashboard to Sales sidebar nav, reorder items"
```

---

## Task 3: Dashboard API — `/api/sales/dashboard`

**Files:**
- Create: `src/app/api/sales/dashboard/route.ts`

- [ ] **Step 1: Create the dashboard API route**

Create file `src/app/api/sales/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const cFilter = companyFilter(companyId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfLastQuarter = new Date(startOfQuarter);
    startOfLastQuarter.setMonth(startOfLastQuarter.getMonth() - 3);
    const endOfLastQuarter = new Date(startOfQuarter);
    endOfLastQuarter.setDate(endOfLastQuarter.getDate() - 1);

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // === KPI Queries (parallel) ===
    const [
      totalCPOs,
      totalCPOsLastMonth,
      pendingAcceptanceCPOs,
      orderValueMonth,
      orderValueLastMonth,
      overdueDeliveries,
      pendingProcessingCount,
      stockReservationStats,
      quotationsThisQuarter,
      quotationsLastQuarter,
      cposThisQuarter,
      cposLastQuarter,
      rateRevisionImpact,
      deliveriesDueThisWeek,
      topCustomersRaw,
      recentCPOs,
    ] = await Promise.all([
      // Total CPOs (current FY - approximate as current year)
      prisma.clientPurchaseOrder.count({
        where: { ...cFilter, status: { not: "CANCELLED" } },
      }),

      // Total CPOs last month
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Pending acceptance - CPOs with status REGISTERED and no ISSUED POAcceptance
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          status: "REGISTERED",
          poAcceptance: { is: null },
        },
        select: { id: true, cpoDate: true },
      }),

      // Order value this month
      prisma.clientPurchaseOrder.aggregate({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: startOfMonth },
        },
        _sum: { grandTotal: true },
      }),

      // Order value last month
      prisma.clientPurchaseOrder.aggregate({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { grandTotal: true },
      }),

      // Overdue deliveries - CPOs/items past delivery date and not fulfilled
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          status: { in: ["REGISTERED", "PARTIALLY_FULFILLED"] },
          deliveryDate: { lt: now },
        },
        select: { id: true, deliveryDate: true },
      }),

      // Pending processing - accepted CPOs without sales orders
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: "REGISTERED",
          poAcceptance: { status: "ISSUED" },
        },
      }),

      // Stock reservation stats from sales order items
      prisma.salesOrderItem.groupBy({
        by: ["salesOrderId"],
        where: {
          salesOrder: {
            ...cFilter,
            status: "OPEN",
          },
        },
        _count: true,
      }),

      // Quotations this quarter (sent/approved/won)
      prisma.quotation.count({
        where: {
          ...cFilter,
          status: { in: ["SENT", "APPROVED", "WON"] },
          quotationDate: { gte: startOfQuarter },
        },
      }),

      // Quotations last quarter
      prisma.quotation.count({
        where: {
          ...cFilter,
          status: { in: ["SENT", "APPROVED", "WON"] },
          quotationDate: { gte: startOfLastQuarter, lte: endOfLastQuarter },
        },
      }),

      // CPOs this quarter
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: startOfQuarter },
        },
      }),

      // CPOs last quarter
      prisma.clientPurchaseOrder.count({
        where: {
          ...cFilter,
          status: { not: "CANCELLED" },
          cpoDate: { gte: startOfLastQuarter, lte: endOfLastQuarter },
        },
      }),

      // Rate negotiation impact this month
      prisma.rateRevision.aggregate({
        where: {
          ...cFilter,
          changedAt: { gte: startOfMonth },
        },
        _count: true,
      }),

      // Deliveries due this week
      prisma.clientPurchaseOrder.findMany({
        where: {
          ...cFilter,
          status: { in: ["REGISTERED", "PARTIALLY_FULFILLED"] },
          deliveryDate: { gte: startOfWeek, lte: endOfWeek },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { deliveryDate: "asc" },
        take: 10,
      }),

      // Top customers by order value this month
      prisma.clientPOItem.groupBy({
        by: ["clientPurchaseOrderId"],
        where: {
          clientPurchaseOrder: {
            ...cFilter,
            status: { not: "CANCELLED" },
            cpoDate: { gte: startOfMonth },
          },
        },
        _sum: { amount: true },
      }),

      // Recent CPOs
      prisma.clientPurchaseOrder.findMany({
        where: { ...cFilter },
        include: {
          customer: { select: { name: true } },
          quotation: { select: { quotationNo: true } },
        },
        orderBy: { cpoDate: "desc" },
        take: 10,
      }),
    ]);

    // === Process KPIs ===

    // Pending acceptance aging
    const agingBuckets = { lt3: 0, "3to7": 0, gt7: 0 };
    for (const cpo of pendingAcceptanceCPOs) {
      const daysOld = Math.floor((now.getTime() - new Date(cpo.cpoDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld < 3) agingBuckets.lt3++;
      else if (daysOld <= 7) agingBuckets["3to7"]++;
      else agingBuckets.gt7++;
    }

    // Overdue avg days
    let avgDaysOverdue = 0;
    if (overdueDeliveries.length > 0) {
      const totalDays = overdueDeliveries.reduce((sum, cpo) => {
        const days = Math.floor((now.getTime() - new Date(cpo.deliveryDate!).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgDaysOverdue = Math.round(totalDays / overdueDeliveries.length);
    }

    // Order value comparison
    const orderValueMonthNum = Number(orderValueMonth._sum.grandTotal || 0);
    const orderValueLastMonthNum = Number(orderValueLastMonth._sum.grandTotal || 0);
    const orderValueChangePercent = orderValueLastMonthNum > 0
      ? Math.round(((orderValueMonthNum - orderValueLastMonthNum) / orderValueLastMonthNum) * 100)
      : 0;

    // CPO count comparison
    const totalCPOsThisMonth = await prisma.clientPurchaseOrder.count({
      where: { ...cFilter, status: { not: "CANCELLED" }, cpoDate: { gte: startOfMonth } },
    });
    const cpoChangePercent = totalCPOsLastMonth > 0
      ? Math.round(((totalCPOsThisMonth - totalCPOsLastMonth) / totalCPOsLastMonth) * 100)
      : 0;

    // Quotation conversion rate
    const conversionThisQuarter = quotationsThisQuarter > 0
      ? Math.round((cposThisQuarter / quotationsThisQuarter) * 100)
      : 0;
    const conversionLastQuarter = quotationsLastQuarter > 0
      ? Math.round((cposLastQuarter / quotationsLastQuarter) * 100)
      : 0;

    // Top customers - need to aggregate by customer
    const customerOrderMap = new Map<string, { customerId: string; customerName: string; orderValue: number }>();
    for (const cpo of recentCPOs) {
      if (cpo.cpoDate >= startOfMonth && cpo.status !== "CANCELLED") {
        const existing = customerOrderMap.get(cpo.customerId);
        const cpoTotal = Number(cpo.grandTotal || 0);
        if (existing) {
          existing.orderValue += cpoTotal;
        } else {
          customerOrderMap.set(cpo.customerId, {
            customerId: cpo.customerId,
            customerName: cpo.customer.name,
            orderValue: cpoTotal,
          });
        }
      }
    }
    // If recentCPOs doesn't cover all this month, do a dedicated query
    const topCustomers = await prisma.clientPurchaseOrder.groupBy({
      by: ["customerId"],
      where: {
        ...cFilter,
        status: { not: "CANCELLED" },
        cpoDate: { gte: startOfMonth },
      },
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 5,
    });

    // Fetch customer names for top customers
    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await prisma.customerMaster.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

    const topCustomersResult = topCustomers.map((c) => ({
      customerId: c.customerId,
      customerName: customerNameMap.get(c.customerId) || "Unknown",
      orderValue: Number(c._sum.grandTotal || 0),
    }));

    // Stock allotment stats
    const soItemsWithReservations = await prisma.salesOrderItem.findMany({
      where: {
        salesOrder: { ...cFilter, status: "OPEN" },
      },
      include: {
        stockReservations: {
          where: { status: "RESERVED" },
          select: { reservedQtyMtr: true },
        },
      },
    });

    let pendingStock = 0;
    let partialStock = 0;
    for (const item of soItemsWithReservations) {
      const totalReserved = item.stockReservations.reduce(
        (sum, r) => sum + Number(r.reservedQtyMtr || 0), 0
      );
      const qty = Number(item.quantity);
      if (totalReserved === 0) pendingStock++;
      else if (totalReserved < qty) partialStock++;
    }

    // Rate negotiation impact - get actual discount amounts
    const rateRevisions = await prisma.rateRevision.findMany({
      where: { ...cFilter, changedAt: { gte: startOfMonth } },
      include: {
        clientPOItem: { select: { qtyOrdered: true } },
      },
    });

    let totalDiscountAmount = 0;
    let totalOriginalValue = 0;
    for (const rev of rateRevisions) {
      const qty = Number(rev.clientPOItem.qtyOrdered);
      const diff = Number(rev.oldRate) - Number(rev.newRate);
      totalDiscountAmount += diff * qty;
      totalOriginalValue += Number(rev.oldRate) * qty;
    }
    const avgDiscountPercent = totalOriginalValue > 0
      ? Math.round((totalDiscountAmount / totalOriginalValue) * 1000) / 10
      : 0;

    // Format deliveries due this week
    const deliveriesFormatted = [
      ...deliveriesDueThisWeek.map((cpo) => ({
        id: cpo.id,
        cpoNo: cpo.cpoNo,
        customerName: cpo.customer.name,
        deliveryDate: cpo.deliveryDate,
        isOverdue: cpo.deliveryDate ? new Date(cpo.deliveryDate) < now : false,
      })),
      // Also include overdue from before this week
      ...overdueDeliveries
        .filter((cpo) => !cpo.deliveryDate || new Date(cpo.deliveryDate) < startOfWeek)
        .slice(0, 5)
        .map((cpo) => ({
          id: cpo.id,
          cpoNo: "",
          customerName: "",
          deliveryDate: cpo.deliveryDate,
          isOverdue: true,
        })),
    ];

    // Fetch full details for overdue items not in this week's query
    const overdueIds = overdueDeliveries
      .filter((cpo) => !cpo.deliveryDate || new Date(cpo.deliveryDate) < startOfWeek)
      .map((cpo) => cpo.id)
      .slice(0, 5);

    if (overdueIds.length > 0) {
      const overdueDetails = await prisma.clientPurchaseOrder.findMany({
        where: { id: { in: overdueIds } },
        include: { customer: { select: { name: true } } },
      });
      for (const od of overdueDetails) {
        const idx = deliveriesFormatted.findIndex((d) => d.id === od.id);
        if (idx !== -1) {
          deliveriesFormatted[idx].cpoNo = od.cpoNo;
          deliveriesFormatted[idx].customerName = od.customer.name;
        }
      }
    }

    // Format recent CPOs
    const recentCPOsFormatted = recentCPOs.map((cpo) => ({
      id: cpo.id,
      cpoNo: cpo.cpoNo,
      customerName: cpo.customer.name,
      clientPoNumber: cpo.clientPoNumber,
      grandTotal: Number(cpo.grandTotal || 0),
      status: cpo.status,
      deliveryDate: cpo.deliveryDate,
    }));

    return NextResponse.json({
      kpis: {
        totalCPOs,
        cpoChangePercent,
        pendingAcceptance: pendingAcceptanceCPOs.length,
        pendingAcceptanceAging: agingBuckets,
        orderValueMonth: orderValueMonthNum,
        orderValueChangePercent,
        overdueDeliveries: overdueDeliveries.length,
        avgDaysOverdue,
        pendingProcessing: pendingProcessingCount,
        stockAllotment: { partial: partialStock, pending: pendingStock },
        quotationConversion: conversionThisQuarter,
        quotationConversionChange: conversionThisQuarter - conversionLastQuarter,
        rateNegotiationImpact: totalDiscountAmount,
        avgDiscountPercent,
      },
      deliveriesDueThisWeek: deliveriesFormatted.sort((a, b) => {
        if (!a.deliveryDate) return 1;
        if (!b.deliveryDate) return -1;
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      }),
      topCustomers: topCustomersResult,
      recentCPOs: recentCPOsFormatted,
    });
  } catch (error) {
    console.error("Error fetching sales dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify the API compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "dashboard" || echo "No errors"
```

Expected: No errors related to the dashboard route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales/dashboard/route.ts
git commit -m "feat: add sales dashboard aggregation API endpoint"
```

---

## Task 4: Sales Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/sales/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

Create file `src/app/(dashboard)/sales/dashboard/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Clock,
  IndianRupee,
  AlertTriangle,
  Package,
  Warehouse,
  TrendingUp,
  Percent,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { toast } from "sonner";

interface DashboardData {
  kpis: {
    totalCPOs: number;
    cpoChangePercent: number;
    pendingAcceptance: number;
    pendingAcceptanceAging: { lt3: number; "3to7": number; gt7: number };
    orderValueMonth: number;
    orderValueChangePercent: number;
    overdueDeliveries: number;
    avgDaysOverdue: number;
    pendingProcessing: number;
    stockAllotment: { partial: number; pending: number };
    quotationConversion: number;
    quotationConversionChange: number;
    rateNegotiationImpact: number;
    avgDiscountPercent: number;
  };
  deliveriesDueThisWeek: {
    id: string;
    cpoNo: string;
    customerName: string;
    deliveryDate: string | null;
    isOverdue: boolean;
  }[];
  topCustomers: {
    customerId: string;
    customerName: string;
    orderValue: number;
  }[];
  recentCPOs: {
    id: string;
    cpoNo: string;
    customerName: string;
    clientPoNumber: string;
    grandTotal: number;
    status: string;
    deliveryDate: string | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  REGISTERED: "default",
  PARTIALLY_FULFILLED: "outline",
  FULLY_FULFILLED: "default",
  CANCELLED: "destructive",
};

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export default function SalesDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/sales/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoading />;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Failed to load dashboard</div>;

  const { kpis } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Sales Dashboard"
          description="Overview of client purchase orders, deliveries, and performance"
        />
        <Button onClick={() => router.push("/client-purchase-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Register New PO
        </Button>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Client POs</p>
                <p className="text-3xl font-bold mt-1">{kpis.totalCPOs}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.cpoChangePercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`text-xs ${kpis.cpoChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {kpis.cpoChangePercent >= 0 ? "+" : ""}{kpis.cpoChangePercent}% this month
                  </span>
                </div>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Acceptance</p>
                <p className="text-3xl font-bold mt-1">{kpis.pendingAcceptance}</p>
                {kpis.pendingAcceptanceAging.gt7 > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {kpis.pendingAcceptanceAging.gt7} aging &gt; 7 days
                  </p>
                )}
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Value (Month)</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.orderValueMonth)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.orderValueChangePercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`text-xs ${kpis.orderValueChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {kpis.orderValueChangePercent >= 0 ? "+" : ""}{kpis.orderValueChangePercent}% vs last month
                  </span>
                </div>
              </div>
              <IndianRupee className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Overdue Deliveries</p>
                <p className={`text-3xl font-bold mt-1 ${kpis.overdueDeliveries > 0 ? "text-red-600" : ""}`}>
                  {kpis.overdueDeliveries}
                </p>
                {kpis.overdueDeliveries > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg {kpis.avgDaysOverdue} days overdue
                  </p>
                )}
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Processing</p>
                <p className="text-3xl font-bold mt-1">{kpis.pendingProcessing}</p>
              </div>
              <Package className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Stock Allotment</p>
                <p className="text-3xl font-bold mt-1">
                  {kpis.stockAllotment.partial + kpis.stockAllotment.pending}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.stockAllotment.partial} partial, {kpis.stockAllotment.pending} pending
                </p>
              </div>
              <Warehouse className="w-8 h-8 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Quotation Conversion</p>
                <p className="text-3xl font-bold mt-1">{kpis.quotationConversion}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.quotationConversionChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`text-xs ${kpis.quotationConversionChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {kpis.quotationConversionChange >= 0 ? "+" : ""}{kpis.quotationConversionChange}% vs last quarter
                  </span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-slate-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Rate Negotiation Impact</p>
                <p className="text-3xl font-bold mt-1">
                  {kpis.rateNegotiationImpact > 0 ? "-" : ""}{formatCurrency(Math.abs(kpis.rateNegotiationImpact))}
                </p>
                {kpis.avgDiscountPercent > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg {kpis.avgDiscountPercent}% discount
                  </p>
                )}
              </div>
              <Percent className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Deliveries + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deliveries Due This Week */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deliveries Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {data.deliveriesDueThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No deliveries due this week</p>
            ) : (
              <div className="space-y-2">
                {data.deliveriesDueThisWeek.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-muted/50 ${
                      item.isOverdue ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/20"
                    }`}
                    onClick={() => router.push(`/client-purchase-orders/${item.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.cpoNo}</span>
                      <span className="text-muted-foreground">{item.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.deliveryDate && (
                        <span className={item.isOverdue ? "text-red-600 font-medium" : ""}>
                          {format(new Date(item.deliveryDate), "dd MMM")}
                        </span>
                      )}
                      {item.isOverdue && (
                        <Badge variant="destructive" className="text-xs">OVERDUE</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers + Aging */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Customers (Month)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="space-y-2">
                  {data.topCustomers.map((customer, idx) => (
                    <div key={customer.customerId} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                        {customer.customerName}
                      </span>
                      <span className="font-medium">{formatCurrency(customer.orderValue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PO Aging (Pending Acceptance)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-green-600">{kpis.pendingAcceptanceAging.lt3}</p>
                  <p className="text-xs text-muted-foreground">&lt; 3 days</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-amber-600">{kpis.pendingAcceptanceAging["3to7"]}</p>
                  <p className="text-xs text-muted-foreground">3-7 days</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-red-600">{kpis.pendingAcceptanceAging.gt7}</p>
                  <p className="text-xs text-muted-foreground">&gt; 7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button onClick={() => router.push("/client-purchase-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Register New PO
        </Button>
        <Button variant="outline" onClick={() => router.push("/client-purchase-orders")}>
          <Eye className="w-4 h-4 mr-2" />
          View All Orders
        </Button>
      </div>

      {/* Recent CPOs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Client Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CPO No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Client PO</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CDD</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentCPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No client purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                data.recentCPOs.map((cpo) => (
                  <TableRow key={cpo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/client-purchase-orders/${cpo.id}`)}>
                    <TableCell className="font-medium">{cpo.cpoNo}</TableCell>
                    <TableCell>{cpo.customerName}</TableCell>
                    <TableCell>{cpo.clientPoNumber}</TableCell>
                    <TableCell className="text-right">
                      {cpo.grandTotal ? `₹${cpo.grandTotal.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[cpo.status] as any || "secondary"}>
                        {cpo.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cpo.deliveryDate ? format(new Date(cpo.deliveryDate), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/sales/dashboard/page.tsx
git commit -m "feat: add sales dashboard page with KPI cards, deliveries, and recent CPOs"
```

---

## Task 5: Client PO Create — Replace deliverySchedule with Date Picker + Item Delivery Dates

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Update formData state — replace deliverySchedule with deliveryDate**

Find the formData initial state (around line 120-135). Change `deliverySchedule: ""` to `deliveryDate: ""`:

```typescript
// Old
deliverySchedule: "",
// New
deliveryDate: "",
```

- [ ] **Step 2: Add deliveryDate to SelectedItem interface**

Update the `SelectedItem` interface (around line 80):

```typescript
interface SelectedItem extends BalanceItem {
  selected: boolean;
  qtyOrdered: number;
  itemDeliveryDate: string;
}
```

- [ ] **Step 3: Update item initialization to include itemDeliveryDate**

Find where `balanceItems` are initialized from the quotation balance API response (in the `fetchQuotationBalance` function). Add `itemDeliveryDate: ""` to each item:

```typescript
// Where items are mapped from the balance response, add:
itemDeliveryDate: "",
```

- [ ] **Step 4: Replace the Delivery Schedule input with a date picker**

Find the Delivery Schedule input field (around line 610-619). Replace it:

```tsx
<div className="space-y-2">
  <Label>Delivery Date (CDD)</Label>
  <Input
    type="date"
    value={formData.deliveryDate}
    onChange={(e) =>
      setFormData({ ...formData, deliveryDate: e.target.value })
    }
  />
</div>
```

- [ ] **Step 5: Add Item CDD column to the items table**

In the items table header (around line 708-721), add a new column after the "Amount" column:

```tsx
<TableHead>Item CDD</TableHead>
```

In the items table body, add a new cell after the Amount cell for each item row:

```tsx
<TableCell>
  {item.selected && (
    <Input
      type="date"
      className="w-[140px]"
      value={item.itemDeliveryDate}
      onChange={(e) => {
        const updated = [...balanceItems];
        updated[index] = { ...updated[index], itemDeliveryDate: e.target.value };
        setBalanceItems(updated);
      }}
      min={formData.deliveryDate || undefined}
    />
  )}
</TableCell>
```

- [ ] **Step 6: Update form submission to send deliveryDate fields**

Find the `handleSubmit` function. Update the payload:

Change `deliverySchedule: formData.deliverySchedule` to `deliveryDate: formData.deliveryDate`:

```typescript
deliveryDate: formData.deliveryDate || null,
```

In the items mapping within the payload, add `deliveryDate`:

```typescript
items: selectedItems.map((item, idx) => ({
  // ... existing fields
  deliveryDate: item.itemDeliveryDate || null,
})),
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "feat: replace delivery schedule text with date picker, add item-level CDD"
```

---

## Task 6: Client PO Create — Inline Rate Negotiation Per Item

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Add rate negotiation state to SelectedItem**

Update the `SelectedItem` interface:

```typescript
interface SelectedItem extends BalanceItem {
  selected: boolean;
  qtyOrdered: number;
  itemDeliveryDate: string;
  negotiatedRate: number;
  rateRemark: string;
}
```

- [ ] **Step 2: Initialize negotiatedRate and rateRemark when items load**

In the `fetchQuotationBalance` function, when mapping items:

```typescript
negotiatedRate: item.unitRate,
rateRemark: "",
```

- [ ] **Step 3: Add Quoted Rate, Negotiated Rate, Diff, and Remark columns to items table**

Replace the existing single "Rate" column header with:

```tsx
<TableHead className="text-right">Quoted Rate</TableHead>
<TableHead className="text-right w-[120px]">Order Rate</TableHead>
<TableHead className="text-right">Diff</TableHead>
<TableHead className="w-[180px]">Rate Remark</TableHead>
```

Replace the existing Rate cell with:

```tsx
{/* Quoted Rate (read-only) */}
<TableCell className="text-right text-muted-foreground">
  {item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
</TableCell>

{/* Negotiated Rate (editable) */}
<TableCell className="text-right">
  {item.selected ? (
    <Input
      type="number"
      className="w-[120px] text-right"
      value={item.negotiatedRate}
      onChange={(e) => {
        const updated = [...balanceItems];
        updated[index] = {
          ...updated[index],
          negotiatedRate: parseFloat(e.target.value) || 0,
        };
        setBalanceItems(updated);
      }}
      min={0}
      step={0.01}
    />
  ) : (
    item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })
  )}
</TableCell>

{/* Diff */}
<TableCell className="text-right">
  {item.selected && item.negotiatedRate !== item.unitRate ? (
    <span className={item.negotiatedRate < item.unitRate ? "text-red-600" : "text-green-600"}>
      {item.negotiatedRate < item.unitRate ? "-" : "+"}
      {Math.abs(item.unitRate - item.negotiatedRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      {" "}
      ({Math.abs(((item.unitRate - item.negotiatedRate) / item.unitRate) * 100).toFixed(1)}%)
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</TableCell>

{/* Rate Remark */}
<TableCell>
  {item.selected && item.negotiatedRate !== item.unitRate ? (
    <Input
      className="w-[180px]"
      value={item.rateRemark}
      onChange={(e) => {
        const updated = [...balanceItems];
        updated[index] = { ...updated[index], rateRemark: e.target.value };
        setBalanceItems(updated);
      }}
      placeholder="Remark (required)"
    />
  ) : null}
</TableCell>
```

- [ ] **Step 4: Update amount calculation to use negotiatedRate**

Find where the item amount is calculated (the Amount cell). Change it to use `negotiatedRate`:

```tsx
<TableCell className="text-right font-medium">
  {item.selected
    ? (item.qtyOrdered * item.negotiatedRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })
    : "-"}
</TableCell>
```

Also update the `materialValue` useMemo calculation to use `negotiatedRate`:

```typescript
const materialValue = useMemo(() => {
  return balanceItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.qtyOrdered * item.negotiatedRate, 0);
}, [balanceItems]);
```

- [ ] **Step 5: Add validation — remark required when rate differs**

In the `handleSubmit` function, add validation before the API call:

```typescript
// Validate rate remarks
const itemsMissingRemark = selectedItems.filter(
  (item) => item.negotiatedRate !== item.unitRate && !item.rateRemark.trim()
);
if (itemsMissingRemark.length > 0) {
  toast.error("Rate remark is required for all items with negotiated rates");
  return;
}
```

- [ ] **Step 6: Update form submission to send negotiatedRate and rateRemark**

In the items mapping within `handleSubmit`:

```typescript
items: selectedItems.map((item, idx) => ({
  quotationItemId: item.id,
  sNo: idx + 1,
  product: item.product,
  material: item.material,
  additionalSpec: item.additionalSpec,
  sizeLabel: item.sizeLabel,
  od: item.od,
  wt: item.wt,
  ends: item.ends,
  uom: item.uom,
  hsnCode: item.hsnCode,
  qtyQuoted: item.qtyQuoted,
  qtyOrdered: item.qtyOrdered,
  unitRate: item.negotiatedRate,
  quotedRate: item.unitRate,
  rateRemark: item.rateRemark || null,
  amount: item.qtyOrdered * item.negotiatedRate,
  deliveryDate: item.itemDeliveryDate || null,
})),
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "feat: add inline rate negotiation with quoted rate comparison and remark"
```

---

## Task 7: Client PO Create — Bulk Rate Negotiation Section

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Add bulk negotiation state**

Add state variables:

```typescript
const [bulkDiscountPercent, setBulkDiscountPercent] = useState<string>("");
const [bulkOverallRemark, setBulkOverallRemark] = useState<string>("");
const [showNegotiationSection, setShowNegotiationSection] = useState(false);
```

- [ ] **Step 2: Add applyBulkDiscount function**

```typescript
function applyBulkDiscount() {
  const percent = parseFloat(bulkDiscountPercent);
  if (isNaN(percent) || percent <= 0 || percent > 100) {
    toast.error("Enter a valid discount percentage (0-100)");
    return;
  }
  if (!bulkOverallRemark.trim()) {
    toast.error("Overall remark is required for bulk rate changes");
    return;
  }

  const updated = balanceItems.map((item) => {
    if (!item.selected) return item;
    const newRate = Math.round(item.unitRate * (1 - percent / 100) * 100) / 100;
    return {
      ...item,
      negotiatedRate: newRate,
      rateRemark: item.rateRemark || bulkOverallRemark,
    };
  });
  setBalanceItems(updated);
  toast.success(`Applied ${percent}% discount to all selected items`);
}
```

- [ ] **Step 3: Add the collapsible Rate Negotiation Summary section**

Add this after the items table Card and before the Additional Charges section:

```tsx
{/* Rate Negotiation Section */}
{balanceItems.some((item) => item.selected) && (
  <Card>
    <CardHeader
      className="cursor-pointer"
      onClick={() => setShowNegotiationSection(!showNegotiationSection)}
    >
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">Rate Negotiation Summary</CardTitle>
        <Badge variant="outline">
          {balanceItems.filter((item) => item.selected && item.negotiatedRate !== item.unitRate).length} items negotiated
        </Badge>
      </div>
    </CardHeader>
    {showNegotiationSection && (
      <CardContent className="space-y-4">
        {/* Bulk Actions */}
        <div className="flex items-end gap-3 p-3 bg-muted/30 rounded-md">
          <div className="space-y-1">
            <Label className="text-xs">Discount %</Label>
            <Input
              type="number"
              className="w-[100px]"
              value={bulkDiscountPercent}
              onChange={(e) => setBulkDiscountPercent(e.target.value)}
              placeholder="e.g. 5"
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Overall Remark</Label>
            <Input
              value={bulkOverallRemark}
              onChange={(e) => setBulkOverallRemark(e.target.value)}
              placeholder="e.g. 5% volume discount per email dated 10-Apr"
            />
          </div>
          <Button type="button" onClick={applyBulkDiscount}>
            Apply to All
          </Button>
        </div>

        {/* Summary Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Item Description</TableHead>
              <TableHead className="text-right">Quoted Rate</TableHead>
              <TableHead className="text-right">Order Rate</TableHead>
              <TableHead className="text-right">Diff (₹)</TableHead>
              <TableHead className="text-right">Diff (%)</TableHead>
              <TableHead>Remark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balanceItems
              .filter((item) => item.selected)
              .map((item, idx) => {
                const diff = item.unitRate - item.negotiatedRate;
                const diffPercent = item.unitRate > 0 ? (diff / item.unitRate) * 100 : 0;
                const originalIndex = balanceItems.indexOf(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="text-sm">
                      {item.product} {item.material ? `/ ${item.material}` : ""} {item.sizeLabel || ""}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-[110px] text-right ml-auto"
                        value={item.negotiatedRate}
                        onChange={(e) => {
                          const updated = [...balanceItems];
                          updated[originalIndex] = {
                            ...updated[originalIndex],
                            negotiatedRate: parseFloat(e.target.value) || 0,
                          };
                          setBalanceItems(updated);
                        }}
                        min={0}
                        step={0.01}
                      />
                    </TableCell>
                    <TableCell className={`text-right ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : ""}`}>
                      {diff !== 0 ? `${diff > 0 ? "-" : "+"}${Math.abs(diff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className={`text-right ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : ""}`}>
                      {diff !== 0 ? `${diffPercent.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-[160px]"
                        value={item.rateRemark}
                        onChange={(e) => {
                          const updated = [...balanceItems];
                          updated[originalIndex] = { ...updated[originalIndex], rateRemark: e.target.value };
                          setBalanceItems(updated);
                        }}
                        placeholder={diff !== 0 ? "Required" : ""}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        {/* Total Impact */}
        {(() => {
          const selectedItems = balanceItems.filter((item) => item.selected);
          const totalQuoted = selectedItems.reduce((sum, item) => sum + item.qtyOrdered * item.unitRate, 0);
          const totalNegotiated = selectedItems.reduce((sum, item) => sum + item.qtyOrdered * item.negotiatedRate, 0);
          const totalDiff = totalQuoted - totalNegotiated;
          const totalDiffPercent = totalQuoted > 0 ? (totalDiff / totalQuoted) * 100 : 0;
          return totalDiff !== 0 ? (
            <div className="flex justify-end gap-6 p-3 bg-muted/30 rounded-md text-sm">
              <span className="text-muted-foreground">Total Impact:</span>
              <span className={totalDiff > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                {totalDiff > 0 ? "-" : "+"}₹{Math.abs(totalDiff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                {" "}({totalDiffPercent.toFixed(1)}%)
              </span>
            </div>
          ) : null;
        })()}
      </CardContent>
    )}
  </Card>
)}
```

- [ ] **Step 4: Update handleSubmit to include bulkOverallRemark**

In the submit payload, add:

```typescript
bulkOverallRemark: bulkOverallRemark || null,
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "feat: add bulk rate negotiation section with discount % and summary table"
```

---

## Task 8: API — Accept deliveryDate and Rate Fields in POST, Create RateRevisions

**Files:**
- Modify: `src/app/api/client-purchase-orders/route.ts`

- [ ] **Step 1: Update POST handler to accept deliveryDate**

In the POST handler body extraction (around line 60-70), add:

```typescript
const {
  // ... existing fields
  deliveryDate,  // add this
  bulkOverallRemark,  // add this
} = await request.json();
```

- [ ] **Step 2: Add deliveryDate to the create data**

In the `prisma.clientPurchaseOrder.create` call, add to the data object:

```typescript
deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
```

- [ ] **Step 3: Handle rate revisions after CPO creation**

After the CPO is created successfully, add rate revision creation:

```typescript
// Create rate revisions for negotiated rates
const rateRevisions = [];
for (const item of createdCPO.items) {
  const inputItem = items.find(
    (i: any) => i.quotationItemId === item.quotationItemId && i.sNo === item.sNo
  );
  if (inputItem?.quotedRate && inputItem.quotedRate !== inputItem.unitRate) {
    rateRevisions.push({
      clientPOItemId: item.id,
      oldRate: inputItem.quotedRate,
      newRate: inputItem.unitRate,
      remark: inputItem.rateRemark || "Rate negotiated at PO registration",
      overallRemark: bulkOverallRemark || null,
      changedById: session.user.id,
      companyId: companyId!,
    });
  }
}

if (rateRevisions.length > 0) {
  await prisma.rateRevision.createMany({ data: rateRevisions });
}
```

- [ ] **Step 4: Include deliveryDate for each item in the create**

In the items mapping within the `prisma.clientPurchaseOrder.create` call, add:

```typescript
deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
```

Note: `ClientPOItem` already has a `deliveryDate` field in the schema.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/client-purchase-orders/route.ts
git commit -m "feat: accept deliveryDate and create rate revisions on CPO creation"
```

---

## Task 9: API — Add PATCH Handler and Include RateRevisions in GET

**Files:**
- Modify: `src/app/api/client-purchase-orders/[id]/route.ts`

- [ ] **Step 1: Update GET handler to include rateRevisions**

In the `include` for items, add `rateRevisions`:

```typescript
items: {
  include: {
    quotationItem: {
      select: {
        id: true,
        quantity: true,
        unitRate: true,  // Add this to get quoted rate
        clientPOItems: {
          include: {
            clientPurchaseOrder: {
              select: { id: true, cpoNo: true, status: true },
            },
          },
        },
      },
    },
    rateRevisions: {
      include: {
        changedBy: { select: { name: true } },
      },
      orderBy: { changedAt: "desc" as const },
    },
  },
  orderBy: { sNo: "asc" as const },
},
```

In the `enrichedItems` mapping, add rate revision data:

```typescript
quotedRate: item.quotationItem.unitRate ? Number(item.quotationItem.unitRate) : Number(item.unitRate),
rateRevisions: item.rateRevisions.map((rev) => ({
  id: rev.id,
  oldRate: Number(rev.oldRate),
  newRate: Number(rev.newRate),
  remark: rev.remark,
  overallRemark: rev.overallRemark,
  changedBy: rev.changedBy.name,
  changedAt: rev.changedAt,
})),
```

- [ ] **Step 2: Add PATCH handler for rate updates**

Add after the GET handler:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("clientPO", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { items, bulkOverallRemark } = body;

    const existingCPO = await prisma.clientPurchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingCPO) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    if (existingCPO.status === "CANCELLED" || existingCPO.status === "FULLY_FULFILLED") {
      return NextResponse.json({ error: "Cannot modify a cancelled or fulfilled order" }, { status: 400 });
    }

    // Handle rate updates with revisions
    if (items && Array.isArray(items)) {
      const rateRevisions = [];

      for (const itemUpdate of items) {
        const existingItem = existingCPO.items.find((i) => i.id === itemUpdate.id);
        if (!existingItem) continue;

        const oldRate = Number(existingItem.unitRate);
        const newRate = parseFloat(itemUpdate.unitRate);

        if (isNaN(newRate) || newRate <= 0) continue;
        if (oldRate === newRate) continue;

        // Update the item rate
        const newAmount = Number(existingItem.qtyOrdered) * newRate;
        await prisma.clientPOItem.update({
          where: { id: itemUpdate.id },
          data: {
            unitRate: newRate,
            amount: newAmount,
          },
        });

        // Create rate revision
        rateRevisions.push({
          clientPOItemId: itemUpdate.id,
          oldRate: oldRate,
          newRate: newRate,
          remark: itemUpdate.rateRemark || "Rate updated",
          overallRemark: bulkOverallRemark || null,
          changedById: session.user.id,
          companyId: companyId!,
        });
      }

      if (rateRevisions.length > 0) {
        await prisma.rateRevision.createMany({ data: rateRevisions });
      }

      // Recalculate subtotal and grand total
      const updatedItems = await prisma.clientPOItem.findMany({
        where: { clientPurchaseOrderId: id },
      });
      const newSubtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount), 0);

      // Recalculate GST
      const additionalChargesTotal = Number(existingCPO.additionalChargesTotal || 0);
      const taxableAmount = newSubtotal + additionalChargesTotal;
      const gstRate = Number(existingCPO.gstRate || 18);
      const isInterState = existingCPO.isInterState;

      let cgst = 0, sgst = 0, igst = 0;
      if (isInterState) {
        igst = (taxableAmount * gstRate) / 100;
      } else {
        cgst = (taxableAmount * gstRate) / 200;
        sgst = (taxableAmount * gstRate) / 200;
      }

      const grandTotalRaw = taxableAmount + cgst + sgst + igst;
      const roundOff = Math.round(grandTotalRaw) - grandTotalRaw;

      await prisma.clientPurchaseOrder.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxableAmount,
          cgst,
          sgst,
          igst,
          roundOff,
          grandTotal: Math.round(grandTotalRaw),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client purchase order:", error);
    return NextResponse.json({ error: "Failed to update client purchase order" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add missing import**

Ensure `checkAccess` is imported (it should already be from the GET handler).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/client-purchase-orders/\[id\]/route.ts
git commit -m "feat: add PATCH handler for rate updates with revision tracking, include rateRevisions in GET"
```

---

## Task 10: Rate Revisions API — History Endpoint

**Files:**
- Create: `src/app/api/client-purchase-orders/[id]/rate-revisions/route.ts`

- [ ] **Step 1: Create the rate revisions API**

Create file `src/app/api/client-purchase-orders/[id]/rate-revisions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("clientPO", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    const where: any = {
      clientPOItem: { clientPurchaseOrderId: id },
    };
    if (itemId) {
      where.clientPOItemId = itemId;
    }

    const revisions = await prisma.rateRevision.findMany({
      where,
      include: {
        changedBy: { select: { name: true } },
        clientPOItem: {
          select: { sNo: true, product: true, sizeLabel: true },
        },
      },
      orderBy: { changedAt: "desc" },
    });

    return NextResponse.json(
      revisions.map((rev) => ({
        id: rev.id,
        itemId: rev.clientPOItemId,
        sNo: rev.clientPOItem.sNo,
        product: rev.clientPOItem.product,
        sizeLabel: rev.clientPOItem.sizeLabel,
        oldRate: Number(rev.oldRate),
        newRate: Number(rev.newRate),
        remark: rev.remark,
        overallRemark: rev.overallRemark,
        changedBy: rev.changedBy.name,
        changedAt: rev.changedAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching rate revisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate revisions" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/client-purchase-orders/\[id\]/rate-revisions/route.ts
git commit -m "feat: add rate revisions history API endpoint"
```

---

## Task 11: Client PO Detail Page — Display Delivery Dates and Rate Revision History

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx`

Note: This file needs to be created if it doesn't exist, or the existing route at `src/app/(dashboard)/client-purchase-orders/page.tsx` detail view needs to be checked. Based on the exploration, the detail view likely exists. Read the file first and make targeted edits.

- [ ] **Step 1: Read the existing detail page to understand its structure**

Read `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx` (or find where the detail view is rendered — it may use the list page with a dialog or a dedicated route).

- [ ] **Step 2: Add delivery date display**

In the CPO details section, add after the delivery terms display:

```tsx
{clientPO.deliveryDate && (
  <div>
    <Label className="text-xs text-muted-foreground">Delivery Date (CDD)</Label>
    <p className="font-medium">{format(new Date(clientPO.deliveryDate), "dd MMM yyyy")}</p>
  </div>
)}
```

In the items table, add an "Item CDD" column:

```tsx
<TableHead>Item CDD</TableHead>
```

And the corresponding cell:

```tsx
<TableCell>
  {item.deliveryDate
    ? format(new Date(item.deliveryDate), "dd MMM yyyy")
    : clientPO.deliveryDate
    ? <span className="text-muted-foreground text-xs">{format(new Date(clientPO.deliveryDate), "dd MMM")} (inherited)</span>
    : "—"}
</TableCell>
```

- [ ] **Step 3: Add Quoted Rate column and rate revision history popover**

Add a "Quoted Rate" column before the existing Rate column:

```tsx
<TableHead className="text-right">Quoted Rate</TableHead>
```

Cell:
```tsx
<TableCell className="text-right text-muted-foreground">
  {item.quotedRate ? item.quotedRate.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
</TableCell>
```

After the Rate cell, add a rate history indicator:

```tsx
<TableCell>
  {item.rateRevisions && item.rateRevisions.length > 0 && (
    <button
      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
      onClick={() => {
        setSelectedItemRevisions(item.rateRevisions);
        setShowRevisionDialog(true);
      }}
    >
      <Clock className="w-3 h-3" />
      {item.rateRevisions.length} revision(s)
    </button>
  )}
</TableCell>
```

- [ ] **Step 4: Add rate revision history dialog**

Add state:
```typescript
const [showRevisionDialog, setShowRevisionDialog] = useState(false);
const [selectedItemRevisions, setSelectedItemRevisions] = useState<any[]>([]);
```

Add the dialog component (using the existing Dialog component pattern from the project):

```tsx
{/* Rate Revision History Dialog */}
{showRevisionDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRevisionDialog(false)}>
    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold mb-4">Rate Revision History</h3>
      <div className="space-y-3">
        {selectedItemRevisions.map((rev: any) => (
          <div key={rev.id} className="border rounded-md p-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-muted-foreground">₹{rev.oldRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                <span className="mx-2">→</span>
                <span className="font-medium">₹{rev.newRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                <span className={`ml-2 text-xs ${rev.newRate < rev.oldRate ? "text-red-600" : "text-green-600"}`}>
                  ({rev.newRate < rev.oldRate ? "-" : "+"}{Math.abs(((rev.oldRate - rev.newRate) / rev.oldRate) * 100).toFixed(1)}%)
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(rev.changedAt), "dd MMM yyyy, HH:mm")}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{rev.remark}</p>
            {rev.overallRemark && <p className="mt-1 text-xs text-muted-foreground italic">{rev.overallRemark}</p>}
            <p className="mt-1 text-xs text-muted-foreground">By: {rev.changedBy}</p>
          </div>
        ))}
      </div>
      <Button className="mt-4 w-full" variant="outline" onClick={() => setShowRevisionDialog(false)}>
        Close
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Import required components**

Add `Clock` to the lucide-react imports if not already present.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/
git commit -m "feat: display delivery dates and rate revision history on CPO detail page"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run the dev server and test manually**

```bash
npx next dev --turbopack
```

Test checklist:
1. Navigate to `/sales/dashboard` — verify KPI cards load with data
2. Click "Register New PO" — verify the create form loads
3. On create form — verify date picker replaces delivery schedule text field
4. Select a quotation — verify item-level CDD column appears
5. Change a rate — verify diff calculation and remark field appears
6. Apply bulk discount — verify all selected items update
7. Submit the form — verify rate revisions are created
8. View the CPO detail — verify delivery dates and rate revision history display

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
