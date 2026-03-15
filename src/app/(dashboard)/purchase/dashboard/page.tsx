"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Package,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Activity,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  summary: {
    totalPR: number;
    totalPO: number;
    totalRFQ: number;
    activePOs: number;
    overduePOs: number;
    dueThisWeek: number;
  };
  vendorPerformance: Array<{
    vendorId: string;
    vendorName: string;
    totalPOs: number;
    deliveredPOs: number;
    onTimeDeliveries: number;
    onTimePercent: number;
    totalSpend: number;
    avgDelayDays: number;
    qualityScore: number;
  }>;
  poStatusBreakdown: Array<{ status: string; count: number }>;
  procurementCycleTime: {
    avgDays: number;
    totalCompleted: number;
  };
  monthlySpend: Array<{ month: string; amount: number }>;
}

type SortKey =
  | "vendorName"
  | "totalPOs"
  | "deliveredPOs"
  | "onTimePercent"
  | "totalSpend"
  | "avgDelayDays"
  | "qualityScore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = [
  "#3b82f6", // blue - DRAFT
  "#f59e0b", // amber - PENDING_APPROVAL
  "#10b981", // emerald - OPEN
  "#6366f1", // indigo - SENT_TO_VENDOR
  "#8b5cf6", // violet - PARTIALLY_RECEIVED
  "#14b8a6", // teal - FULLY_RECEIVED
  "#64748b", // slate - CLOSED
  "#ef4444", // red - CANCELLED
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  OPEN: "Open",
  SENT_TO_VENDOR: "Sent to Vendor",
  PARTIALLY_RECEIVED: "Partially Received",
  FULLY_RECEIVED: "Fully Received",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 10000000) {
    return `\u20B9${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `\u20B9${(value / 100000).toFixed(2)} L`;
  }
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return format(d, "MMM yy");
}

function getRatingBadge(score: number) {
  if (score >= 9)
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Excellent
      </Badge>
    );
  if (score >= 7)
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
        Good
      </Badge>
    );
  if (score >= 5)
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        Average
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Poor</Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PurchaseDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("totalSpend");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/purchase/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        toast.error(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const sortedVendors = useMemo(() => {
    if (!data) return [];
    const list = [...data.vendorPerformance];
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return list;
  }, [data, sortKey, sortAsc]);

  const top10SpendVendors = useMemo(() => {
    if (!data) return [];
    return [...data.vendorPerformance]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10)
      .map((v) => ({
        name: v.vendorName.length > 20 ? v.vendorName.slice(0, 20) + "..." : v.vendorName,
        spend: v.totalSpend,
      }));
  }, [data]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        </div>
      </TableHead>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Purchase Dashboard" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Purchase Dashboard" />
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Failed to load dashboard data. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, poStatusBreakdown, procurementCycleTime, monthlySpend } =
    data;

  const pieData = poStatusBreakdown.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
  }));

  const monthlyChartData = monthlySpend.map((m) => ({
    month: formatMonth(m.month),
    amount: m.amount,
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Purchase Dashboard" />

      {/* ------------------------------------------------------------------ */}
      {/* Summary Cards */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          title="Total PRs"
          value={summary.totalPR}
          icon={<FileText className="h-4 w-4" />}
          iconBg="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          title="Total POs"
          value={summary.totalPO}
          icon={<Package className="h-4 w-4" />}
          iconBg="bg-indigo-100 text-indigo-600"
        />
        <SummaryCard
          title="Total RFQs"
          value={summary.totalRFQ}
          icon={<ShoppingCart className="h-4 w-4" />}
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <SummaryCard
          title="Active POs"
          value={summary.activePOs}
          icon={<Activity className="h-4 w-4" />}
          iconBg="bg-violet-100 text-violet-600"
        />
        <SummaryCard
          title="Overdue POs"
          value={summary.overduePOs}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconBg="bg-red-100 text-red-600"
          valueClass="text-red-600"
        />
        <SummaryCard
          title="Due This Week"
          value={summary.dueThisWeek}
          icon={<Clock className="h-4 w-4" />}
          iconBg="bg-amber-100 text-amber-600"
          valueClass="text-amber-600"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts Row */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PO Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PO Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No purchase order data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spend Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No spend data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Spend",
                    ]}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Procurement Cycle Time */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procurement Cycle Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-8">
            <div>
              <p className="text-sm text-muted-foreground">
                Average Days (PR to PO)
              </p>
              <p className="text-3xl font-bold text-primary">
                {procurementCycleTime.avgDays}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  days
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Completed Procurement Cycles
              </p>
              <p className="text-3xl font-bold">
                {procurementCycleTime.totalCompleted}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Vendor Performance Table */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No vendor performance data available
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Vendor Name" field="vendorName" />
                    <SortHeader label="Total POs" field="totalPOs" />
                    <SortHeader label="Delivered" field="deliveredPOs" />
                    <SortHeader label="On-Time %" field="onTimePercent" />
                    <SortHeader label="Total Spend" field="totalSpend" />
                    <SortHeader label="Avg Delay (days)" field="avgDelayDays" />
                    <SortHeader label="Quality Score" field="qualityScore" />
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVendors.map((v) => (
                    <TableRow key={v.vendorId}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {v.vendorName}
                      </TableCell>
                      <TableCell>{v.totalPOs}</TableCell>
                      <TableCell>{v.deliveredPOs}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress
                            value={v.onTimePercent}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {v.onTimePercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(v.totalSpend)}</TableCell>
                      <TableCell>
                        {v.avgDelayDays > 0 ? (
                          <span className="text-red-600">
                            {v.avgDelayDays}
                          </span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>{v.qualityScore}/10</TableCell>
                      <TableCell>{getRatingBadge(v.qualityScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Vendor Spend Analysis (Top 10) */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Vendor Spend Analysis (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top10SpendVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No vendor spend data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(300, top10SpendVendors.length * 40)}>
              <BarChart
                data={top10SpendVendors}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={12}
                  width={150}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Spend",
                  ]}
                />
                <Bar dataKey="spend" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card sub-component
// ---------------------------------------------------------------------------

function SummaryCard({
  title,
  value,
  icon,
  iconBg,
  valueClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${valueClass || ""}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
