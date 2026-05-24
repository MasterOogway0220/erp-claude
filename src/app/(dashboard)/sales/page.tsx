"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  FileText,
  AlertCircle,
  ShoppingCart,
  Clock,
  IndianRupee,
  AlertTriangle,
  Package,
  Warehouse,
  TrendingUp,
  Percent,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesOrder {
  id: string;
  soNo: string;
  soDate: string;
  customer: {
    name: string;
    city?: string;
  };
  quotation?: {
    quotationNo: string;
  };
  customerPoNo?: string;
  customerPoDate?: string;
  poAcceptanceStatus: string;
  status: string;
  items: any[];
}

interface DashboardKpis {
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${(value / 1000).toFixed(1)}K`;
}

// ---------------------------------------------------------------------------
// Compact KPI tile
// ---------------------------------------------------------------------------

interface KpiTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  borderColor: string;
  valueClass?: string;
  subtitleClass?: string;
}

function KpiTile({ title, value, subtitle, icon, borderColor, valueClass, subtitleClass }: KpiTileProps) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={`text-xl font-bold mt-0.5 ${valueClass || ""}`}>{value}</p>
            {subtitle && (
              <p className={`text-[10px] mt-0.5 ${subtitleClass || "text-muted-foreground"}`}>
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
// Status colours
// ---------------------------------------------------------------------------

const soStatusColors: Record<string, string> = {
  OPEN: "bg-blue-500",
  PARTIALLY_DISPATCHED: "bg-yellow-500",
  FULLY_DISPATCHED: "bg-green-500",
  CLOSED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

const poAcceptanceColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SalesOrdersPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  useEffect(() => {
    fetchSalesOrders();
    fetchDashboardKpis();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const response = await fetch("/api/sales-orders");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSalesOrders(data.salesOrders);
    } catch (error) {
      toast.error("Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardKpis = async () => {
    try {
      const res = await fetch("/api/sales/dashboard");
      if (!res.ok) return; // silently skip if unavailable
      const json = await res.json();
      if (json?.kpis) setKpis(json.kpis);
    } catch {
      // non-fatal — stats row simply won't render
    }
  };

  const pendingReviewOrders = salesOrders.filter(
    (so) => so.poAcceptanceStatus === "PENDING"
  );

  const soColumns: Column<SalesOrder>[] = [
    {
      key: "soNo",
      header: "SO Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.soNo}</span>
      ),
    },
    {
      key: "soDate",
      header: "SO Date",
      cell: (row) => format(new Date(row.soDate), "dd MMM yyyy"),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer.name}</div>
          <div className="text-sm text-muted-foreground">{row.customer.city || ""}</div>
        </div>
      ),
    },
    {
      key: "customerPoNo",
      header: "Customer PO",
      cell: (row) => (
        <div>
          <div className="font-mono text-sm">{row.customerPoNo || "—"}</div>
          {row.customerPoDate && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.customerPoDate), "dd MMM yyyy")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "quotation",
      header: "Quotation",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.quotation?.quotationNo || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "SO Status",
      cell: (row) => (
        <Badge className={soStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "poAcceptanceStatus",
      header: "PO Status",
      cell: (row) => (
        <Badge className={poAcceptanceColors[row.poAcceptanceStatus] || "bg-gray-500"}>
          {row.poAcceptanceStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/sales/${row.id}`)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      ),
    },
  ];

  const reviewColumns: Column<SalesOrder>[] = [
    {
      key: "soNo",
      header: "SO Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.soNo}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer.name}</div>
          <div className="text-sm text-muted-foreground">{row.customer.city || ""}</div>
        </div>
      ),
    },
    {
      key: "customerPoNo",
      header: "Customer PO",
      cell: (row) => (
        <div>
          <div className="font-mono text-sm">{row.customerPoNo || "—"}</div>
          {row.customerPoDate && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.customerPoDate), "dd MMM yyyy")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "quotation",
      header: "Reference Quotation",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.quotation?.quotationNo || "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => (
        <span className="text-sm">{row.items.length} item(s)</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          onClick={() => router.push(`/sales/${row.id}/review`)}
        >
          <FileText className="w-4 h-4 mr-1" />
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage sales orders and customer PO verification"
      >
        <Button onClick={() => router.push("/sales/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Create Order Process
        </Button>
      </PageHeader>

      {/* ------------------------------------------------------------------ */}
      {/* Compact KPI stats row (sourced from /api/sales/dashboard)           */}
      {/* ------------------------------------------------------------------ */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiTile
            title="Total Client POs"
            value={kpis.totalCPOs}
            subtitle={`${kpis.cpoChangePercent >= 0 ? "+" : ""}${kpis.cpoChangePercent}% vs last mo`}
            icon={<ShoppingCart className="h-8 w-8" />}
            borderColor="border-l-blue-500"
            subtitleClass={kpis.cpoChangePercent >= 0 ? "text-green-600" : "text-red-500"}
          />
          <KpiTile
            title="Pending Acceptance"
            value={kpis.pendingAcceptance}
            subtitle={kpis.pendingAcceptanceAging.gt7 > 0 ? `${kpis.pendingAcceptanceAging.gt7} >7 days` : "All clear"}
            icon={<Clock className="h-8 w-8" />}
            borderColor="border-l-amber-500"
            subtitleClass={kpis.pendingAcceptanceAging.gt7 > 0 ? "text-red-500" : "text-muted-foreground"}
          />
          <KpiTile
            title="Order Value (Mo)"
            value={formatCurrency(kpis.orderValueMonth)}
            subtitle={`${kpis.orderValueChangePercent >= 0 ? "+" : ""}${kpis.orderValueChangePercent}% vs last mo`}
            icon={<IndianRupee className="h-8 w-8" />}
            borderColor="border-l-green-500"
            subtitleClass={kpis.orderValueChangePercent >= 0 ? "text-green-600" : "text-red-500"}
          />
          <KpiTile
            title="Overdue Deliveries"
            value={kpis.overdueDeliveries}
            subtitle={kpis.overdueDeliveries > 0 ? `Avg ${kpis.avgDaysOverdue}d overdue` : "None"}
            icon={<AlertTriangle className="h-8 w-8" />}
            borderColor="border-l-red-500"
            valueClass={kpis.overdueDeliveries > 0 ? "text-red-600" : ""}
            subtitleClass={kpis.overdueDeliveries > 0 ? "text-red-500" : "text-muted-foreground"}
          />
          <KpiTile
            title="Pending Processing"
            value={kpis.pendingProcessing}
            subtitle="Awaiting action"
            icon={<Package className="h-8 w-8" />}
            borderColor="border-l-purple-500"
          />
          <KpiTile
            title="Stock Allotment"
            value={kpis.stockAllotment.partial + kpis.stockAllotment.pending}
            subtitle={`${kpis.stockAllotment.pending} pending`}
            icon={<Warehouse className="h-8 w-8" />}
            borderColor="border-l-cyan-500"
          />
          <KpiTile
            title="Quote Conversion"
            value={`${kpis.quotationConversion}%`}
            subtitle={`${kpis.quotationConversionChange >= 0 ? "+" : ""}${kpis.quotationConversionChange}% vs last mo`}
            icon={<TrendingUp className="h-8 w-8" />}
            borderColor="border-l-slate-500"
            subtitleClass={kpis.quotationConversionChange >= 0 ? "text-green-600" : "text-red-500"}
          />
          <KpiTile
            title="Rate Nego Impact"
            value={formatCurrency(kpis.rateNegotiationImpact)}
            subtitle={`Avg disc: ${kpis.avgDiscountPercent}%`}
            icon={<Percent className="h-8 w-8" />}
            borderColor="border-l-orange-500"
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Orders table (tabs)                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="review">
            <div className="flex items-center gap-2">
              Customer PO Review
              {pendingReviewOrders.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingReviewOrders.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Loading sales orders...
            </div>
          ) : (
            <DataTable
              columns={soColumns}
              data={salesOrders}
              searchKey="soNo"
              searchPlaceholder="Search by SO Number, Customer PO..."
            />
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {pendingReviewOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No customer POs pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">
                      {pendingReviewOrders.length} Customer PO(s) Pending Review
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Review and compare customer POs against quotations before acceptance
                    </p>
                  </div>
                </div>
              </div>
              <DataTable
                columns={reviewColumns}
                data={pendingReviewOrders}
                searchKey="soNo"
                searchPlaceholder="Search..."
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
