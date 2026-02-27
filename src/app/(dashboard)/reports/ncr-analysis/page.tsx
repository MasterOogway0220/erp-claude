"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ExportButton } from "@/components/shared/export-button";
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
import { AlertTriangle, CheckCircle, XCircle, FileWarning } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface NCRByVendor {
  vendorId: string | null;
  vendorName: string;
  count: number;
}

interface NCRByType {
  type: string;
  count: number;
}

interface NCRMonthly {
  month: string;
  count: number;
}

interface NCRAnalysisData {
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  byVendor: NCRByVendor[];
  byType: NCRByType[];
  monthlyTrend: NCRMonthly[];
}

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function NCRAnalysisPage() {
  const [data, setData] = useState<NCRAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/ncr-analysis");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch NCR analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="NCR Analysis"
          description="Non-conformance trends by vendor, type, and monthly frequency"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading NCR analysis...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="NCR Analysis"
          description="Non-conformance trends by vendor, type, and monthly frequency"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No NCR data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  const pieData = (data.byType || []).map((t) => ({
    name: t.type.replace(/_/g, " "),
    value: t.count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="NCR Analysis"
        description="Non-conformance trends by vendor, type, and monthly frequency"
      >
        <ExportButton reportType="ncr" label="Export NCR CSV" />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total NCRs</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalNCRs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.openNCRs || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.closedNCRs || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {Math.max(0, (data.totalNCRs || 0) - (data.openNCRs || 0) - (data.closedNCRs || 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly NCR Trend Chart */}
      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly NCR Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="NCRs"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 5, fill: "#ef4444" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* NCR by Type - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>NCRs by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={true}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No NCR type data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* NCR by Vendor - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>NCRs by Vendor (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byVendor && data.byVendor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.byVendor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="vendorName"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="NCRs" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No vendor NCR data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>NCRs by Vendor (Detail)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byVendor && data.byVendor.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">NCR Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byVendor.map((vendor) => (
                    <TableRow key={vendor.vendorId ?? "unknown"}>
                      <TableCell>
                        <div className="font-medium">{vendor.vendorName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {vendor.count > 0 ? (
                          <Badge variant="destructive">{vendor.count}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No vendor NCR data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NCRs by Type (Detail)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byType && data.byType.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NCR Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byType.map((type, index) => {
                    const totalByType = data.byType.reduce((s, t) => s + t.count, 0);
                    const pct = totalByType > 0 ? (type.count / totalByType) * 100 : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {type.type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {type.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No NCR type data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
