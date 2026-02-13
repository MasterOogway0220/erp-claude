"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  BarChart3,
  Warehouse,
  ShieldCheck,
  Truck,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface SalesMetrics {
  revenue: number;
  orderCount: number;
  enquiryCount: number;
  quotationCount: number;
  openSOValue: number;
  poCount: number;
  conversionRate: number;
}

interface InventoryMetrics {
  totalStock: number;
  accepted: number;
  underInspection: number;
  acceptedTotalMtr: number;
  inventoryValue: number | null;
}

interface QualityMetrics {
  totalNCRs: number;
  openNCRs: number;
  inspectionPassRate: number;
}

interface DispatchMetrics {
  totalDispatches: number;
  onTimeDeliveryPct: number;
  todayDispatches: number;
}

interface FinancialMetrics {
  outstandingReceivables: number;
  totalReceived: number;
}

interface LowStockAlert {
  product: string;
  sizeLabel: string;
  availableQty: number;
  pieces: number;
}

interface ManagementReviewData {
  salesMetrics: SalesMetrics;
  inventoryMetrics: InventoryMetrics;
  qualityMetrics: QualityMetrics;
  dispatchMetrics: DispatchMetrics;
  financialMetrics: FinancialMetrics;
  lowStockAlerts: LowStockAlert[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function ManagementReviewPage() {
  const [data, setData] = useState<ManagementReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/management-review");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch management review:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Management Review"
          description="Combined KPIs across all departments"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading management review...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Management Review"
          description="Combined KPIs across all departments"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No management review data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  const sales = data.salesMetrics || {
    revenue: 0,
    orderCount: 0,
    enquiryCount: 0,
    quotationCount: 0,
    openSOValue: 0,
    poCount: 0,
    conversionRate: 0,
  };
  const inventory = data.inventoryMetrics || {
    totalStock: 0,
    accepted: 0,
    underInspection: 0,
    acceptedTotalMtr: 0,
    inventoryValue: null,
  };
  const quality = data.qualityMetrics || {
    totalNCRs: 0,
    openNCRs: 0,
    inspectionPassRate: 0,
  };
  const dispatch = data.dispatchMetrics || {
    totalDispatches: 0,
    onTimeDeliveryPct: 0,
    todayDispatches: 0,
  };
  const finance = data.financialMetrics || {
    outstandingReceivables: 0,
    totalReceived: 0,
  };

  // Compute rejected from total - accepted - underInspection for the inventory chart
  const inventoryRejected = Math.max(0, inventory.totalStock - inventory.accepted - inventory.underInspection);

  // Inventory totals for pie chart
  const inventoryTotal = inventory.accepted + inventory.underInspection + inventoryRejected;
  const inventoryAcceptedPct = inventoryTotal > 0 ? (inventory.accepted / inventoryTotal) * 100 : 0;
  const inventoryInspectionPct = inventoryTotal > 0 ? (inventory.underInspection / inventoryTotal) * 100 : 0;
  const inventoryRejectedPct = inventoryTotal > 0 ? (inventoryRejected / inventoryTotal) * 100 : 0;

  return (
    <div className="space-y-8 print:space-y-6">
      <PageHeader
        title="Management Review"
        description="Combined KPIs across all departments"
      />

      {/* Sales Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Sales</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Number(sales.revenue))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.orderCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open SO Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(sales.openSOValue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open POs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.poCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sales.conversionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Warehouse className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Inventory</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.totalStock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {inventory.accepted}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Inspection</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {inventory.underInspection}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Qty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventory.acceptedTotalMtr.toFixed(1)} Mtr
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryTotal > 0 ? (
            <div className="space-y-4">
              {/* Stacked bar representation */}
              <div className="flex h-8 w-full overflow-hidden rounded-full">
                <div
                  style={{ width: `${inventoryAcceptedPct}%` }}
                  className="bg-green-500 transition-all duration-500"
                  title={`Accepted: ${inventory.accepted} (${inventoryAcceptedPct.toFixed(1)}%)`}
                />
                <div
                  style={{ width: `${inventoryInspectionPct}%` }}
                  className="bg-yellow-400 transition-all duration-500"
                  title={`Under Inspection: ${inventory.underInspection} (${inventoryInspectionPct.toFixed(1)}%)`}
                />
                <div
                  style={{ width: `${inventoryRejectedPct}%` }}
                  className="bg-red-500 transition-all duration-500"
                  title={`Other/Rejected: ${inventoryRejected} (${inventoryRejectedPct.toFixed(1)}%)`}
                />
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Accepted: {inventory.accepted} ({inventoryAcceptedPct.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span>Under Inspection: {inventory.underInspection} ({inventoryInspectionPct.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Other/Rejected: {inventoryRejected} ({inventoryRejectedPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No inventory data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <ShieldCheck className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Quality</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total NCRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quality.totalNCRs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open NCRs</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {quality.openNCRs}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspection Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  quality.inspectionPassRate >= 90
                    ? "text-green-600"
                    : quality.inspectionPassRate >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {quality.inspectionPassRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality Metrics - Inspection Pass Rate Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Pass Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pass Rate</span>
              <span
                className={`font-semibold ${
                  quality.inspectionPassRate >= 90
                    ? "text-green-600"
                    : quality.inspectionPassRate >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {quality.inspectionPassRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                style={{ width: `${Math.min(100, quality.inspectionPassRate)}%` }}
                className={`h-full rounded-full transition-all duration-700 ${
                  quality.inspectionPassRate >= 90
                    ? "bg-green-500"
                    : quality.inspectionPassRate >= 75
                    ? "bg-yellow-400"
                    : "bg-red-500"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Target: 90%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Truck className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold">Dispatch</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dispatches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dispatch.totalDispatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  dispatch.onTimeDeliveryPct >= 90
                    ? "text-green-600"
                    : dispatch.onTimeDeliveryPct >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {dispatch.onTimeDeliveryPct.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Dispatches</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dispatch.todayDispatches}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finance Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <IndianRupee className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Finance</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(finance.outstandingReceivables)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(finance.totalReceived)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Revenue Bar Chart - using sales KPI data */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Open SO Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const maxVal = Math.max(Number(sales.revenue), sales.openSOValue, 1);
              return (
                <>
                  {/* Revenue bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Revenue (Paid)</span>
                      <span className="font-mono">{formatCurrency(Number(sales.revenue))}</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded bg-gray-100">
                      <div
                        style={{ width: `${(Number(sales.revenue) / maxVal) * 100}%` }}
                        className="h-full rounded bg-blue-500 transition-all duration-500"
                      />
                    </div>
                  </div>
                  {/* Open SO Value bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Open SO Value</span>
                      <span className="font-mono">{formatCurrency(sales.openSOValue)}</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded bg-gray-100">
                      <div
                        style={{ width: `${(sales.openSOValue / maxVal) * 100}%` }}
                        className="h-full rounded bg-indigo-400 transition-all duration-500"
                      />
                    </div>
                  </div>
                  {/* Outstanding bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Outstanding Receivables</span>
                      <span className="font-mono">{formatCurrency(finance.outstandingReceivables)}</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded bg-gray-100">
                      <div
                        style={{ width: `${(finance.outstandingReceivables / maxVal) * 100}%` }}
                        className="h-full rounded bg-orange-400 transition-all duration-500"
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
