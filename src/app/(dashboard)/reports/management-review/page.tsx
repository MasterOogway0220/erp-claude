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

interface SalesKPIs {
  totalRevenue: number;
  totalOrders: number;
  openOrders: number;
  avgOrderValue: number;
  conversionRate: number;
}

interface InventoryKPIs {
  totalStock: number;
  accepted: number;
  underInspection: number;
  reserved: number;
  rejected: number;
  avgAgeDays: number;
}

interface QualityKPIs {
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  inspectionPassRate: number;
  avgResolutionDays: number;
}

interface DispatchKPIs {
  totalDispatches: number;
  otdPercent: number;
  avgDelayDays: number;
  pendingDispatches: number;
}

interface FinanceKPIs {
  totalOutstanding: number;
  overdueAmount: number;
  avgPaymentDays: number;
  collectionRate: number;
}

interface ManagementReviewData {
  reportDate: string;
  sales: SalesKPIs;
  inventory: InventoryKPIs;
  quality: QualityKPIs;
  dispatch: DispatchKPIs;
  finance: FinanceKPIs;
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

  const sales = data.sales || {
    totalRevenue: 0,
    totalOrders: 0,
    openOrders: 0,
    avgOrderValue: 0,
    conversionRate: 0,
  };
  const inventory = data.inventory || {
    totalStock: 0,
    accepted: 0,
    underInspection: 0,
    reserved: 0,
    rejected: 0,
    avgAgeDays: 0,
  };
  const quality = data.quality || {
    totalNCRs: 0,
    openNCRs: 0,
    closedNCRs: 0,
    inspectionPassRate: 0,
    avgResolutionDays: 0,
  };
  const dispatch = data.dispatch || {
    totalDispatches: 0,
    otdPercent: 0,
    avgDelayDays: 0,
    pendingDispatches: 0,
  };
  const finance = data.finance || {
    totalOutstanding: 0,
    overdueAmount: 0,
    avgPaymentDays: 0,
    collectionRate: 0,
  };

  return (
    <div className="space-y-8 print:space-y-6">
      <PageHeader
        title="Management Review"
        description={`Combined KPIs across all departments${
          data.reportDate
            ? ` - as of ${format(new Date(data.reportDate), "dd MMM yyyy")}`
            : ""
        }`}
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
                {formatCurrency(sales.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {sales.openOrders}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(sales.avgOrderValue)}
              </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
              <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inventory.reserved}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {inventory.rejected}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Age</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventory.avgAgeDays.toFixed(0)}d
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <ShieldCheck className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Quality</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              <CardTitle className="text-sm font-medium">Closed NCRs</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {quality.closedNCRs}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quality.avgResolutionDays.toFixed(1)} days
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dispatch Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Truck className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold">Dispatch</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">OTD Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  dispatch.otdPercent >= 90
                    ? "text-green-600"
                    : dispatch.otdPercent >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {dispatch.otdPercent.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Delay</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dispatch.avgDelayDays.toFixed(1)} days
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Dispatches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dispatch.pendingDispatches}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(finance.totalOutstanding)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(finance.overdueAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Payment Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {finance.avgPaymentDays.toFixed(0)} days
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  finance.collectionRate >= 90
                    ? "text-green-600"
                    : finance.collectionRate >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {finance.collectionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
