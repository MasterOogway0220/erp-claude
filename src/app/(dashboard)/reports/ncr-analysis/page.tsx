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
import { AlertTriangle, CheckCircle, XCircle, FileWarning } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface NCRByVendor {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
}

interface NCRByType {
  type: string;
  count: number;
  percentage: number;
}

interface NCRMonthly {
  month: string;
  count: number;
  openCount: number;
  closedCount: number;
}

interface NCRAnalysisData {
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  underReview: number;
  byVendor: NCRByVendor[];
  byType: NCRByType[];
  monthlyCounts: NCRMonthly[];
}

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="NCR Analysis"
        description="Non-conformance trends by vendor, type, and monthly frequency"
      />

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
              {data.underReview || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>NCRs by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byVendor && data.byVendor.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byVendor.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vendor.vendorName}</div>
                          <div className="text-sm text-muted-foreground">
                            {vendor.vendorCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {vendor.totalNCRs}
                      </TableCell>
                      <TableCell className="text-right">
                        {vendor.openNCRs > 0 ? (
                          <Badge variant="destructive">{vendor.openNCRs}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-green-600">
                          {vendor.closedNCRs}
                        </span>
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
            <CardTitle>NCRs by Type</CardTitle>
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
                  {data.byType.map((type, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {type.type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {type.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {type.percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
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

      <Card>
        <CardHeader>
          <CardTitle>Monthly NCR Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyCounts && data.monthlyCounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyCounts.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.openCount > 0 ? (
                        <span className="text-red-600">{row.openCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600">{row.closedCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No monthly NCR data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
