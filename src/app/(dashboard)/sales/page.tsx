"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, FileText, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

interface SalesOrder {
  id: string;
  soNo: string;
  soDate: string;
  customer: {
    name: string;
    code: string;
  };
  quotation?: {
    quotationNo: string;
  };
  customerPoNo?: string;
  customerPoDate?: string;
  poAcceptanceStatus: string;
  status: string;
  items: any[];
}

const soStatusColors: Record<string, string> = {
  OPEN: "bg-blue-500",
  PARTIALLY_DISPATCHED: "bg-yellow-500",
  FULLY_DISPATCHED: "bg-green-500",
  CLOSED: "bg-gray-500",
};

const poAcceptanceColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const response = await fetch("/api/sales-orders");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSalesOrders(data.salesOrders);
    } catch (error) {
      toast.error("Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  const pendingReviewOrders = salesOrders.filter(
    (so) => so.poAcceptanceStatus === "PENDING"
  );

  const soColumns: Column<SalesOrder>[] = [
    {
      key: "soNo",
      header: "SO Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.soNo}</span>
      ),
    },
    {
      key: "soDate",
      header: "SO Date",
      cell: (row) => format(new Date(row.soDate), "dd MMM yyyy"),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer.name}</div>
          <div className="text-sm text-muted-foreground">{row.customer.code}</div>
        </div>
      ),
    },
    {
      key: "customerPoNo",
      header: "Customer PO",
      cell: (row) => (
        <div>
          <div className="font-mono text-sm">{row.customerPoNo || "—"}</div>
          {row.customerPoDate && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.customerPoDate), "dd MMM yyyy")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "quotation",
      header: "Quotation",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.quotation?.quotationNo || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "SO Status",
      cell: (row) => (
        <Badge className={soStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "poAcceptanceStatus",
      header: "PO Status",
      cell: (row) => (
        <Badge className={poAcceptanceColors[row.poAcceptanceStatus] || "bg-gray-500"}>
          {row.poAcceptanceStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/sales/${row.id}`)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      ),
    },
  ];

  const reviewColumns: Column<SalesOrder>[] = [
    {
      key: "soNo",
      header: "SO Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.soNo}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer.name}</div>
          <div className="text-sm text-muted-foreground">{row.customer.code}</div>
        </div>
      ),
    },
    {
      key: "customerPoNo",
      header: "Customer PO",
      cell: (row) => (
        <div>
          <div className="font-mono text-sm">{row.customerPoNo || "—"}</div>
          {row.customerPoDate && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.customerPoDate), "dd MMM yyyy")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "quotation",
      header: "Reference Quotation",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.quotation?.quotationNo || "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => (
        <span className="text-sm">{row.items.length} item(s)</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          onClick={() => router.push(`/sales/${row.id}/review`)}
        >
          <FileText className="w-4 h-4 mr-1" />
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Manage sales orders and customer PO verification"
      >
        <Button onClick={() => router.push("/sales/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Sales Order
        </Button>
      </PageHeader>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Sales Orders</TabsTrigger>
          <TabsTrigger value="review">
            <div className="flex items-center gap-2">
              Customer PO Review
              {pendingReviewOrders.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingReviewOrders.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Loading sales orders...
            </div>
          ) : (
            <DataTable
              columns={soColumns}
              data={salesOrders}
              searchKey="soNo"
              searchPlaceholder="Search by SO Number, Customer PO..."
            />
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {pendingReviewOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No customer POs pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">
                      {pendingReviewOrders.length} Customer PO(s) Pending Review
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Review and compare customer POs against quotations before acceptance
                    </p>
                  </div>
                </div>
              </div>
              <DataTable
                columns={reviewColumns}
                data={pendingReviewOrders}
                searchKey="soNo"
                searchPlaceholder="Search..."
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
