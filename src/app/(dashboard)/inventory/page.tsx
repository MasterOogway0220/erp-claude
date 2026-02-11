"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Warehouse,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const stockStatusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
  RESERVED: "bg-blue-500",
  DISPATCHED: "bg-gray-500",
};

export default function InventoryPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchStock();
    fetchGRNs();
  }, [statusFilter]);

  const fetchStock = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const response = await fetch(`/api/inventory/stock?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data.stocks || []);
        setSummary(data.summary || {});
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      const response = await fetch("/api/inventory/grn");
      if (response.ok) {
        const data = await response.json();
        setGrns(data.grns || []);
      }
    } catch (error) {
      console.error("Failed to fetch GRNs:", error);
    }
  };

  const stockColumns: Column<any>[] = [
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <Link
          href={`/inventory/stock/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {(row.heatNo as string) || "—"}
        </Link>
      ),
    },
    { key: "product", header: "Product" },
    { key: "specification", header: "Specification" },
    { key: "sizeLabel", header: "Size" },
    {
      key: "quantityMtr",
      header: "Qty (Mtr)",
      cell: (row) => Number(row.quantityMtr).toFixed(3),
    },
    { key: "pieces", header: "Pcs" },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={stockStatusColors[row.status as string] || "bg-gray-500"}>
          {(row.status as string).replace(/_/g, " ")}
        </Badge>
      ),
    },
    { key: "location", header: "Location" },
    {
      key: "grnItem",
      header: "GRN",
      cell: (row) => {
        const grnItem = row.grnItem as any;
        return grnItem?.grn ? (
          <Link
            href={`/inventory/grn/${grnItem.grn.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {grnItem.grn.grnNo}
          </Link>
        ) : (
          "—"
        );
      },
    },
  ];

  const grnColumns: Column<any>[] = [
    {
      key: "grnNo",
      header: "GRN No.",
      cell: (row) => (
        <Link
          href={`/inventory/grn/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.grnNo as string}
        </Link>
      ),
    },
    {
      key: "grnDate",
      header: "Date",
      cell: (row) => format(new Date(row.grnDate as string), "dd MMM yyyy"),
    },
    {
      key: "purchaseOrder",
      header: "PO No.",
      cell: (row) => (row.purchaseOrder as any)?.poNo || "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.vendor as any)?.name || "—",
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => (row.items as any[])?.length || 0,
    },
    {
      key: "receivedBy",
      header: "Received By",
      cell: (row) => (row.receivedBy as any)?.name || "—",
    },
  ];

  const totalStock = summary.total || 0;
  const accepted = summary.byStatus?.ACCEPTED || 0;
  const underInspection = summary.byStatus?.UNDER_INSPECTION || 0;
  const reserved = summary.byStatus?.RESERVED || 0;
  const rejected = summary.byStatus?.REJECTED || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Stock view, GRN register, and inventory tracking"
      >
        <Button onClick={() => router.push("/inventory/grn/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New GRN
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Inspection</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{underInspection}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock View</TabsTrigger>
          <TabsTrigger value="grn">GRN Register</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventory Stock</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="UNDER_INSPECTION">Under Inspection</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="HOLD">Hold</SelectItem>
                    <SelectItem value="RESERVED">Reserved</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={stockColumns}
                data={stocks}
                searchKey="heatNo"
                searchPlaceholder="Search by heat number..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Goods Receipt Notes</CardTitle>
                <Button onClick={() => router.push("/inventory/grn/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New GRN
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={grnColumns}
                data={grns}
                searchKey="grnNo"
                searchPlaceholder="Search by GRN number..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
