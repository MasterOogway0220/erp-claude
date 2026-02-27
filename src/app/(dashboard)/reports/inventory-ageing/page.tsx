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
import { Clock, AlertTriangle, Package } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AgeingBucket {
  bucket: string;
  count: number;
  totalQuantityMtr: number;
  percentage: number;
}

interface SlowMovingItem {
  id: string;
  heatNo: string;
  product: string;
  specification: string;
  sizeLabel: string;
  quantityMtr: number;
  pieces: number;
  status: string;
  receivedDate: string;
  ageDays: number;
  location: string;
}

interface InventoryAgeing {
  ageingBuckets: AgeingBucket[];
  slowMovingItems: SlowMovingItem[];
  totalItems: number;
  avgAgeDays: number;
}

const BUCKET_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#ef4444", "#991b1b"];

export default function InventoryAgeingPage() {
  const [data, setData] = useState<InventoryAgeing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/inventory-ageing");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch inventory ageing:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBucketColor = (bucket: string) => {
    if (bucket.includes("0-30")) return "text-green-600";
    if (bucket.includes("31-60")) return "text-blue-600";
    if (bucket.includes("61-90")) return "text-yellow-600";
    if (bucket.includes("91-180")) return "text-orange-600";
    return "text-red-600";
  };

  const getAgeBadgeVariant = (ageDays: number) => {
    if (ageDays <= 30) return "bg-green-500";
    if (ageDays <= 60) return "bg-blue-500";
    if (ageDays <= 90) return "bg-yellow-500";
    if (ageDays <= 180) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory Ageing"
          description="Ageing buckets, slow-moving items, and stock rotation analysis"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading inventory ageing...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory Ageing"
          description="Ageing buckets, slow-moving items, and stock rotation analysis"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No ageing data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Ageing"
        description="Ageing buckets, slow-moving items, and stock rotation analysis"
      >
        <ExportButton reportType="inventory-ageing" label="Export Ageing CSV" />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalItems || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Age</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data.avgAgeDays || 0).toFixed(0)} days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Moving (90+ days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(data.slowMovingItems || []).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ageing Distribution Chart */}
      {data.ageingBuckets && data.ageingBuckets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ageing Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ageingBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => {
                    return String(value);
                  }}
                />
                <Bar dataKey="count" name="Items" radius={[4, 4, 0, 0]}>
                  {data.ageingBuckets.map((_, index) => (
                    <Cell key={index} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ageing Buckets</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ageingBuckets && data.ageingBuckets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age Bucket</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Qty (Mtr)</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ageingBuckets.map((bucket, index) => (
                  <TableRow key={index}>
                    <TableCell className={`font-medium ${getBucketColor(bucket.bucket)}`}>
                      {bucket.bucket}
                    </TableCell>
                    <TableCell className="text-right">{bucket.count}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(bucket.totalQuantityMtr).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {bucket.percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No ageing bucket data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle>Slow-Moving Items (90+ days)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.slowMovingItems && data.slowMovingItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Heat No.</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty (Mtr)</TableHead>
                  <TableHead className="text-right">Pcs</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slowMovingItems.map((item) => (
                  <TableRow key={item.id} className="bg-red-50/50">
                    <TableCell>
                      <Link
                        href={`/inventory/stock/${item.id}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {item.heatNo || "---"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell>{item.specification}</TableCell>
                    <TableCell>{item.sizeLabel}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(item.quantityMtr).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{item.pieces}</TableCell>
                    <TableCell>
                      {format(new Date(item.receivedDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getAgeBadgeVariant(item.ageDays)}>
                        {item.ageDays} days
                      </Badge>
                    </TableCell>
                    <TableCell>{item.location || "---"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No slow-moving items detected
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
