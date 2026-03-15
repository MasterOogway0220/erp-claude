"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, TestTube2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const REPORT_TYPE_LABELS: Record<string, string> = {
  CHEMICAL: "Chemical",
  MECHANICAL: "Mechanical",
  HYDRO: "Hydro",
  IMPACT: "Impact",
  IGC: "IGC",
};

const resultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  PENDING: "bg-yellow-500",
};

export default function LabReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedType, setAppliedType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lab-reports", appliedSearch, appliedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      if (appliedType) params.set("reportType", appliedType);
      const res = await fetch(`/api/quality/lab-reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch lab reports");
      return res.json();
    },
  });

  const labReports = data?.labReports || [];

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedType(reportTypeFilter);
  };

  const handleClear = () => {
    setSearch("");
    setReportTypeFilter("");
    setAppliedSearch("");
    setAppliedType("");
  };

  const passCount = labReports.filter((r: any) => r.result === "PASS").length;
  const failCount = labReports.filter((r: any) => r.result === "FAIL").length;
  const pendingCount = labReports.filter((r: any) => r.result === "PENDING" || !r.result).length;

  const columns: Column<any>[] = [
    {
      key: "reportNo",
      header: "Report No.",
      cell: (row) => (
        <Link
          href={`/quality/lab-reports/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.reportNo as string}
        </Link>
      ),
    },
    {
      key: "reportType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">
          {REPORT_TYPE_LABELS[row.reportType as string] || (row.reportType as string)}
        </Badge>
      ),
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => <span className="font-mono text-sm">{row.heatNo as string}</span>,
    },
    {
      key: "itemCode",
      header: "Item Code",
      cell: (row) => (row.itemCode as string) || "—",
    },
    {
      key: "labName",
      header: "Laboratory",
      cell: (row) => (row.labName as string) || "—",
    },
    {
      key: "purchaseOrder",
      header: "PO",
      cell: (row) => {
        const po = row.purchaseOrder as any;
        return po ? (
          <Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline text-sm">
            {po.poNo}
          </Link>
        ) : "—";
      },
    },
    {
      key: "result",
      header: "Result",
      cell: (row) => (
        <Badge className={resultColors[row.result as string] || "bg-gray-500"}>
          {(row.result as string) || "PENDING"}
        </Badge>
      ),
    },
    {
      key: "testDate",
      header: "Test Date",
      cell: (row) =>
        row.testDate ? format(new Date(row.testDate as string), "dd MMM yyyy") : "—",
    },
    {
      key: "reportDate",
      header: "Uploaded",
      cell: (row) => format(new Date(row.reportDate as string), "dd MMM yyyy"),
    },
    {
      key: "uploadedBy",
      header: "Uploaded By",
      cell: (row) => (row.uploadedBy as any)?.name || "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Reports"
        description="Test reports linked to heat numbers, POs, and inventory"
      >
        <Button onClick={() => router.push("/quality/lab-reports/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Lab Report
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <TestTube2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labReports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fail</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Lab Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search by report no, heat no, item code, lab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-sm"
            />
            <Select
              value={reportTypeFilter || undefined}
              onValueChange={(value) => setReportTypeFilter(value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHEMICAL">Chemical</SelectItem>
                <SelectItem value="MECHANICAL">Mechanical</SelectItem>
                <SelectItem value="HYDRO">Hydro</SelectItem>
                <SelectItem value="IMPACT">Impact</SelectItem>
                <SelectItem value="IGC">IGC</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {(appliedSearch || appliedType) && (
              <Button variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
          <DataTable
            columns={columns}
            data={labReports}
            searchKey="reportNo"
            searchPlaceholder="Filter by report number..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
