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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee, ShoppingCart, TrendingUp, Package, Search } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { ExportButton } from "@/components/shared/export-button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";

interface SalesDashboard {
  totalRevenue: number;
  totalOrders: number;
  openOrders: number;
  fullyDispatched: number;
  monthlyTrend: {
    month: string;
    orderCount: number;
    amount: number;
  }[];
  recentOrders: {
    id: string;
    soNo: string;
    soDate: string;
    customerName: string;
    totalAmount: number;
    status: string;
  }[];
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500",
  PARTIALLY_DISPATCHED: "bg-yellow-500",
  FULLY_DISPATCHED: "bg-green-500",
  CLOSED: "bg-gray-500",
};

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function SalesDashboardPage() {
  const [data, setData] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const fyStart = new Date().getMonth() >= 3
    ? `${currentYear}-04-01`
    : `${currentYear - 1}-04-01`;
  const fyEnd = new Date().getMonth() >= 3
    ? `${currentYear + 1}-03-31`
    : `${currentYear}-03-31`;

  const [fromDate, setFromDate] = useState(fyStart);
  const [toDate, setToDate] = useState(fyEnd);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const response = await fetch(`/api/reports/sales-dashboard?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch sales dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sales Dashboard"
          description="Revenue trends, order pipeline, and monthly sales analysis"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading sales dashboard...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sales Dashboard"
          description="Revenue trends, order pipeline, and monthly sales analysis"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No sales data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Dashboard"
        description="Revenue trends, order pipeline, and monthly sales analysis"
      >
        <ExportButton reportType="sales" label="Export Sales CSV" />
      </PageHeader>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="fromDate" className="text-sm">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="toDate" className="text-sm">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleFilter} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Loading..." : "Apply Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatINR(data.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.openOrders || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Dispatched</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.fullyDispatched || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Sales Trend Chart */}
      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Amount" ? formatINR(Number(value)) : value
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="amount" name="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="orderCount" name="Orders" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Sales Trend Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Data</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyTrend.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">{row.orderCount}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No monthly trend data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentOrders && data.recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/sales/${order.id}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {order.soNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.soDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status] || "bg-gray-500"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No recent orders
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
