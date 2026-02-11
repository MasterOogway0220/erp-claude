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
import { Truck, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface MonthlyOTD {
  month: string;
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  otdPercent: number;
}

interface LateDelivery {
  id: string;
  soNo: string;
  customerName: string;
  promisedDate: string;
  actualDate: string;
  delayDays: number;
  product: string;
}

interface OnTimeDeliveryData {
  otdPercent: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  avgDelayDays: number;
  monthlyTrend: MonthlyOTD[];
  lateDeliveryDetails: LateDelivery[];
}

export default function OnTimeDeliveryPage() {
  const [data, setData] = useState<OnTimeDeliveryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/on-time-delivery");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch on-time delivery:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOTDColor = (percent: number) => {
    if (percent >= 90) return "text-green-600";
    if (percent >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getOTDBadge = (percent: number) => {
    if (percent >= 90) return "bg-green-500";
    if (percent >= 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="On-Time Delivery"
          description="OTD percentage, average delays, and late delivery tracking"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading on-time delivery...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="On-Time Delivery"
          description="OTD percentage, average delays, and late delivery tracking"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No delivery data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="On-Time Delivery"
        description="OTD percentage, average delays, and late delivery tracking"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OTD Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-4xl font-bold ${getOTDColor(data.otdPercent || 0)}`}
            >
              {(data.otdPercent || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.onTimeDeliveries || 0} of {data.totalDeliveries || 0} on time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDeliveries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Deliveries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.lateDeliveries || 0}
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
              {(data.avgDelayDays || 0).toFixed(1)} days
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly OTD Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">On Time</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead>OTD %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyTrend.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.totalDeliveries}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {row.onTimeDeliveries}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.lateDeliveries > 0 ? (
                        <span className="font-mono text-red-600">
                          {row.lateDeliveries}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getOTDBadge(row.otdPercent)}>
                        {row.otdPercent.toFixed(1)}%
                      </Badge>
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle>Late Deliveries</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.lateDeliveryDetails && data.lateDeliveryDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Promised Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Delay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lateDeliveryDetails.map((delivery) => (
                  <TableRow key={delivery.id} className="bg-red-50/50">
                    <TableCell>
                      <Link
                        href={`/sales/${delivery.id}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {delivery.soNo}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {delivery.customerName}
                    </TableCell>
                    <TableCell>{delivery.product}</TableCell>
                    <TableCell>
                      {format(new Date(delivery.promisedDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(delivery.actualDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {delivery.delayDays} days late
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No late deliveries recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
