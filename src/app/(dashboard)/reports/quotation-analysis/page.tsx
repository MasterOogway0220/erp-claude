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
import { FileText, Percent, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface QuotationAnalysis {
  statusCounts: {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  conversionRate: number;
  avgResponseDays: number;
  totalQuotations: number;
  recentQuotations: {
    id: string;
    quotationNo: string;
    quotationDate: string;
    customerName: string;
    totalAmount: number;
    status: string;
    responseDays: number | null;
  }[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  EXPIRED: "bg-yellow-500",
  REVISED: "bg-orange-500",
};

export default function QuotationAnalysisPage() {
  const [data, setData] = useState<QuotationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/quotation-analysis");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch quotation analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quotation Analysis"
          description="Conversion rates, response times, and quotation funnel metrics"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading quotation analysis...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quotation Analysis"
          description="Conversion rates, response times, and quotation funnel metrics"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No quotation data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  const statusCounts = data.statusCounts || {
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Analysis"
        description="Conversion rates, response times, and quotation funnel metrics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalQuotations || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(data.conversionRate || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data.avgResponseDays || 0).toFixed(1)} days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.accepted}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Draft</span>
              <span className="text-lg font-semibold">{statusCounts.draft}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Sent</span>
              <span className="text-lg font-semibold">{statusCounts.sent}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Accepted</span>
              <span className="text-lg font-semibold text-green-600">{statusCounts.accepted}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Rejected</span>
              <span className="text-lg font-semibold text-red-600">{statusCounts.rejected}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Expired</span>
              <span className="text-lg font-semibold text-yellow-600">{statusCounts.expired}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lost Reasons */}
      {(data as any).lostReasonsSummary && (data as any).lostReasonsSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lost Enquiry Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as any).lostReasonsSummary.map((item: { reason: string; count: number }) => (
                  <TableRow key={item.reason}>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="text-right font-semibold">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentQuotations && data.recentQuotations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Response Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentQuotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link
                        href={`/quotations/${q.id}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {q.quotationNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(q.quotationDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{q.customerName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(q.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {q.responseDays !== null ? `${q.responseDays} days` : "---"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[q.status] || "bg-gray-500"}>
                        {q.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No quotation data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
