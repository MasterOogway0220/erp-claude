"use client";

import { useState, useEffect } from "react";
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
import { UserCheck, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface VendorScore {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  totalPOs: number;
  onTimePercent: number;
  rejectionPercent: number;
  ncrCount: number;
  avgDelayDays: number;
  overallScore: number;
}

interface VendorPerformanceData {
  vendors: VendorScore[];
  totalVendors: number;
  avgOnTimePercent: number;
  avgRejectionPercent: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};

const getScoreBadge = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const getProgressColor = (value: number, isPositive: boolean = true) => {
  if (isPositive) {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  }
  if (value <= 5) return "bg-green-500";
  if (value <= 15) return "bg-yellow-500";
  return "bg-red-500";
};

export default function VendorPerformancePage() {
  const [data, setData] = useState<VendorPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/vendor-performance");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch vendor performance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor Performance"
          description="Scorecards with on-time delivery, rejection rates, and NCR counts"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading vendor performance...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor Performance"
          description="Scorecards with on-time delivery, rejection rates, and NCR counts"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No vendor performance data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Performance"
        description="Scorecards with on-time delivery, rejection rates, and NCR counts"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVendors || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg On-Time %</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(data.avgOnTimePercent || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rejection %</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(data.avgRejectionPercent || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluated Vendors</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data.vendors || []).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          {data.vendors && data.vendors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total POs</TableHead>
                  <TableHead>On-Time %</TableHead>
                  <TableHead>Rejection %</TableHead>
                  <TableHead className="text-right">NCR Count</TableHead>
                  <TableHead className="text-right">Avg Delay</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vendors.map((vendor) => (
                  <TableRow key={vendor.vendorId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vendor.vendorName}</div>
                        <div className="text-sm text-muted-foreground">
                          {vendor.vendorCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {vendor.totalPOs}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={vendor.onTimePercent}
                          className="w-16 h-2"
                        />
                        <span
                          className={`text-sm font-medium ${
                            vendor.onTimePercent >= 80
                              ? "text-green-600"
                              : vendor.onTimePercent >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {vendor.onTimePercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={vendor.rejectionPercent}
                          className="w-16 h-2"
                        />
                        <span
                          className={`text-sm font-medium ${
                            vendor.rejectionPercent <= 5
                              ? "text-green-600"
                              : vendor.rejectionPercent <= 15
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {vendor.rejectionPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {vendor.ncrCount > 0 ? (
                        <Badge variant="destructive">{vendor.ncrCount}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono text-sm ${
                          vendor.avgDelayDays <= 1
                            ? "text-green-600"
                            : vendor.avgDelayDays <= 5
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {vendor.avgDelayDays.toFixed(1)} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getScoreBadge(vendor.overallScore)}>
                        {vendor.overallScore.toFixed(0)}/100
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No vendor performance data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
