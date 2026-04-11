"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/page-loading";
import { toast } from "sonner";
import { format } from "date-fns";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  return `₹${(value / 1000).toFixed(1)}K`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "REGISTERED":
      return <Badge variant="default">{status.replace(/_/g, " ")}</Badge>;
    case "PARTIALLY_FULFILLED":
      return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>;
    case "FULLY_FULFILLED":
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{status.replace(/_/g, " ")}</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">{status.replace(/_/g, " ")}</Badge>;
    case "DRAFT":
      return <Badge variant="secondary">{status.replace(/_/g, " ")}</Badge>;
    default:
      return <Badge variant="secondary">{status.replace(/_/g, " ")}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  borderColor: string;
  valueClass?: string;
  subtitleClass?: string;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  borderColor,
  valueClass,
  subtitleClass,
}: KpiCardProps) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={`text-2xl font-bold mt-1 ${valueClass || ""}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-1 ${subtitleClass || "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="text-muted-foreground/20 ml-2 shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SalesDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/sales/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sales Dashboard">
          <Button onClick={() => router.push("/client-purchase-orders/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Register New PO
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Failed to load dashboard data. Please refresh.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, deliveriesDueThisWeek, topCustomers, recentCPOs } = data;

  const cpoChangePositive = kpis.cpoChangePercent >= 0;
  const orderValueChangePositive = kpis.orderValueChangePercent >= 0;
  const conversionChangePositive = kpis.quotationConversionChange >= 0;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <PageHeader title="Sales Dashboard">
        <Button onClick={() => router.push("/client-purchase-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Register New PO
        </Button>
      </PageHeader>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row 1 */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Client POs"
          value={kpis.totalCPOs}
          subtitle={
            cpoChangePositive
              ? `+${kpis.cpoChangePercent}% vs last month`
              : `${kpis.cpoChangePercent}% vs last month`
          }
          icon={<ShoppingCart className="h-10 w-10" />}
          borderColor="border-l-blue-500"
          subtitleClass={
            cpoChangePositive ? "text-green-600 flex items-center gap-1" : "text-red-500 flex items-center gap-1"
          }
        />
        <KpiCard
          title="Pending Acceptance"
          value={kpis.pendingAcceptance}
          subtitle={
            kpis.pendingAcceptance > 0
              ? `${kpis.pendingAcceptanceAging.gt7} overdue >7 days`
              : "All clear"
          }
          icon={<Clock className="h-10 w-10" />}
          borderColor="border-l-amber-500"
          subtitleClass={
            kpis.pendingAcceptanceAging.gt7 > 0 ? "text-red-500" : "text-muted-foreground"
          }
        />
        <KpiCard
          title="Order Value (Month)"
          value={formatCurrency(kpis.orderValueMonth)}
          subtitle={
            orderValueChangePositive
              ? `+${kpis.orderValueChangePercent}% vs last month`
              : `${kpis.orderValueChangePercent}% vs last month`
          }
          icon={<IndianRupee className="h-10 w-10" />}
          borderColor="border-l-green-500"
          subtitleClass={
            orderValueChangePositive ? "text-green-600" : "text-red-500"
          }
        />
        <KpiCard
          title="Overdue Deliveries"
          value={kpis.overdueDeliveries}
          subtitle={
            kpis.overdueDeliveries > 0
              ? `Avg ${kpis.avgDaysOverdue} days overdue`
              : "No overdue deliveries"
          }
          icon={<AlertTriangle className="h-10 w-10" />}
          borderColor="border-l-red-500"
          valueClass={kpis.overdueDeliveries > 0 ? "text-red-600" : ""}
          subtitleClass={kpis.overdueDeliveries > 0 ? "text-red-500" : "text-muted-foreground"}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row 2 */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pending Processing"
          value={kpis.pendingProcessing}
          subtitle="CPOs awaiting action"
          icon={<Package className="h-10 w-10" />}
          borderColor="border-l-purple-500"
        />
        <KpiCard
          title="Stock Allotment"
          value={kpis.stockAllotment.partial + kpis.stockAllotment.pending}
          subtitle={`${kpis.stockAllotment.pending} pending, ${kpis.stockAllotment.partial} partial`}
          icon={<Warehouse className="h-10 w-10" />}
          borderColor="border-l-cyan-500"
        />
        <KpiCard
          title="Quotation Conversion"
          value={`${kpis.quotationConversion}%`}
          subtitle={
            conversionChangePositive
              ? `+${kpis.quotationConversionChange}% vs last month`
              : `${kpis.quotationConversionChange}% vs last month`
          }
          icon={<TrendingUp className="h-10 w-10" />}
          borderColor="border-l-slate-500"
          subtitleClass={
            conversionChangePositive ? "text-green-600" : "text-red-500"
          }
        />
        <KpiCard
          title="Rate Negotiation Impact"
          value={formatCurrency(kpis.rateNegotiationImpact)}
          subtitle={`Avg discount: ${kpis.avgDiscountPercent}%`}
          icon={<Percent className="h-10 w-10" />}
          borderColor="border-l-orange-500"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Middle Section: Deliveries + Top Customers + PO Aging */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deliveries Due This Week */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Deliveries Due This Week</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deliveriesDueThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No deliveries due this week
              </p>
            ) : (
              <div className="divide-y">
                {deliveriesDueThisWeek.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/client-purchase-orders/${item.id}`)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      item.isOverdue ? "bg-red-50 hover:bg-red-100/70" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {item.cpoNo}
                        </span>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.customerName}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`text-xs font-medium ${item.isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                        {item.deliveryDate
                          ? format(new Date(item.deliveryDate), "dd MMM yyyy")
                          : "No date"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Top Customers + PO Aging */}
        <div className="flex flex-col gap-4">
          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No data available
                </p>
              ) : (
                <div className="divide-y">
                  {topCustomers.slice(0, 5).map((c, idx) => (
                    <div
                      key={c.customerId}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="text-sm truncate">{c.customerName}</span>
                      </div>
                      <span className="text-sm font-medium ml-2 shrink-0">
                        {formatCurrency(c.orderValue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PO Aging Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PO Acceptance Aging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* < 3 days */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">&lt; 3 days</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {kpis.pendingAcceptanceAging.lt3}
                </span>
              </div>
              {/* 3–7 days */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">3–7 days</span>
                </div>
                <span className="text-sm font-semibold text-amber-600">
                  {kpis.pendingAcceptanceAging["3to7"]}
                </span>
              </div>
              {/* > 7 days */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">&gt; 7 days</span>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {kpis.pendingAcceptanceAging.gt7}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick Actions */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/client-purchase-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Register New PO
        </Button>
        <Button variant="outline" onClick={() => router.push("/client-purchase-orders")}>
          <Eye className="w-4 h-4 mr-2" />
          View All Orders
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent CPOs Table */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Client POs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentCPOs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No client POs found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPO No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Client PO</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CDD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCPOs.map((cpo) => (
                    <TableRow
                      key={cpo.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/client-purchase-orders/${cpo.id}`)}
                    >
                      <TableCell className="font-mono font-medium">
                        {cpo.cpoNo}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {cpo.customerName}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {cpo.clientPoNumber || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cpo.grandTotal)}
                      </TableCell>
                      <TableCell>{getStatusBadge(cpo.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cpo.deliveryDate
                          ? format(new Date(cpo.deliveryDate), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
