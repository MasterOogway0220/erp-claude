"use client";

import { useState, useEffect } from "react";
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
  const [data, setData] = useState<BuyerPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    customerId: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchCustomers();
    fetchData();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/masters/customers");
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.customerId) params.set("customerId", filters.customerId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/reports/buyer-performance?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

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
