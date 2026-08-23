"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useCustomers } from "@/hooks/use-masters";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/data-table";

interface BuyerPerformance {
  customerName: string;
  buyerName: string;
  totalQuotations: number;
  quotationsConverted: number;
  conversionRate: string;
  totalOrderValue: number;
}

export default function BuyerPerformancePage() {
  const customers = useCustomers<any>();
  const [filters, setFilters] = useState({
    customerId: "",
    dateFrom: "",
    dateTo: "",
  });

  // Filters are applied on a button press, not as they are edited, so the
  // key follows the applied set. Re-running a report you already ran — a
  // common thing to do when comparing periods — is then served from cache.
  const [applied, setApplied] = useState(filters);
  const fetchData = () => setApplied(filters);

  const reportParams = new URLSearchParams();
  if (applied.customerId) reportParams.set("customerId", applied.customerId);
  if (applied.dateFrom) reportParams.set("dateFrom", applied.dateFrom);
  if (applied.dateTo) reportParams.set("dateTo", applied.dateTo);

  const { data: reportData, isLoading: loading } = useApiQuery<{
    data: BuyerPerformance[];
  }>(
    ["buyer-performance", applied.customerId, applied.dateFrom, applied.dateTo],
    `/api/reports/buyer-performance?${reportParams}`
  );
  const data = reportData?.data ?? [];

  const columns: Column<BuyerPerformance>[] = [
    { key: "customerName", header: "Customer Name" },
    { key: "buyerName", header: "Buyer Name" },
    {
      key: "totalQuotations",
      header: "Total Quotations",
      cell: (row: BuyerPerformance) => row.totalQuotations.toString(),
    },
    {
      key: "quotationsConverted",
      header: "Converted to Order",
      cell: (row: BuyerPerformance) => row.quotationsConverted.toString(),
    },
    {
      key: "conversionRate",
      header: "Conversion Rate %",
      cell: (row: BuyerPerformance) => `${row.conversionRate}%`,
    },
    {
      key: "totalOrderValue",
      header: "Total Order Value",
      cell: (row: BuyerPerformance) =>
        `₹ ${row.totalOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer Performance Report"
        description="Analyze quotation conversion rates by buyer and customer"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={filters.customerId}
                onValueChange={(v) =>
                  setFilters({ ...filters, customerId: v === "ALL" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Customers</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} disabled={loading}>
                {loading ? "Loading..." : "Apply Filters"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={data}
            columns={columns}
            searchKey="customerName"
            searchPlaceholder="Search by customer..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
