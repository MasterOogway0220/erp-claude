"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

interface PR {
  id: string;
  prNo: string;
  prDate: string;
  salesOrder?: {
    soNo: string;
  };
  suggestedVendor?: {
    name: string;
    city?: string;
  };
  status: string;
  items: any[];
  requiredByDate?: string;
}

interface PO {
  id: string;
  poNo: string;
  poDate: string;
  vendor: {
    name: string;
    city?: string;
  };
  salesOrder?: {
    soNo: string;
  };
  status: string;
  totalAmount: number;
  deliveryDate?: string;
}

const prStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  PO_CREATED: "bg-blue-500",
};

const poStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  APPROVED: "bg-blue-500",
  OPEN: "bg-green-500",
  PARTIALLY_RECEIVED: "bg-yellow-500",
  FULLY_RECEIVED: "bg-purple-500",
  CLOSED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

export default function PurchasePage() {
  const router = useRouter();
  const [prs, setPRs] = useState<PR[]>([]);
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prResponse, poResponse] = await Promise.all([
        fetch("/api/purchase/requisitions"),
        fetch("/api/purchase/orders"),
      ]);

      if (prResponse.ok) {
        const prData = await prResponse.json();
        setPRs(prData.purchaseRequisitions || []);
      }

      if (poResponse.ok) {
        const poData = await poResponse.json();
        setPOs(poData.purchaseOrders || []);
      }
    } catch (error) {
      toast.error("Failed to load purchase data");
    } finally {
      setLoading(false);
    }
  };

  const prColumns: Column<PR>[] = [
    {
      key: "prNo",
      header: "PR Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.prNo}</span>
      ),
    },
    {
      key: "prDate",
      header: "PR Date",
      cell: (row) => format(new Date(row.prDate), "dd MMM yyyy"),
    },
    {
      key: "salesOrder",
      header: "SO Reference",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.salesOrder?.soNo || "Manual"}
        </span>
      ),
    },
    {
      key: "suggestedVendor",
      header: "Suggested Vendor",
      cell: (row) =>
        row.suggestedVendor ? (
          <div>
            <div className="font-medium">{row.suggestedVendor.name}</div>
            <div className="text-sm text-muted-foreground">
              {row.suggestedVendor.city || ""}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => <span>{row.items.length} item(s)</span>,
    },
    {
      key: "requiredByDate",
      header: "Required By",
      cell: (row) =>
        row.requiredByDate
          ? format(new Date(row.requiredByDate), "dd MMM yyyy")
          : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={prStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
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
            onClick={() => router.push(`/purchase/requisitions/${row.id}`)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      ),
    },
  ];

  const poColumns: Column<PO>[] = [
    {
      key: "poNo",
      header: "PO Number",
      cell: (row) => (
        <span className="font-mono font-medium">{row.poNo}</span>
      ),
    },
    {
      key: "poDate",
      header: "PO Date",
      cell: (row) => format(new Date(row.poDate), "dd MMM yyyy"),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.vendor.name}</div>
          <div className="text-sm text-muted-foreground">{row.vendor.city || ""}</div>
        </div>
      ),
    },
    {
      key: "salesOrder",
      header: "SO Reference",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.salesOrder?.soNo || "—"}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (row) => (
        <div className="text-right font-medium">
          ₹{Number(row.totalAmount).toFixed(2)}
        </div>
      ),
    },
    {
      key: "deliveryDate",
      header: "Delivery Date",
      cell: (row) =>
        row.deliveryDate
          ? format(new Date(row.deliveryDate), "dd MMM yyyy")
          : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={poStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/purchase/orders/${row.id}`)}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Management"
        description="Manage purchase requisitions and purchase orders"
      >
        <div className="flex gap-2">
          <Button onClick={() => router.push("/purchase/requisitions/create")}>
            <Plus className="w-4 h-4 mr-2" />
            New PR
          </Button>
          <Button onClick={() => router.push("/purchase/orders/create")}>
            <Plus className="w-4 h-4 mr-2" />
            New PO
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="requisitions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requisitions">
            Purchase Requisitions ({prs.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            Purchase Orders ({pos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requisitions" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={prColumns}
              data={prs}
              searchKey="prNo"
              searchPlaceholder="Search by PR Number..."
            />
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={poColumns}
              data={pos}
              searchKey="poNo"
              searchPlaceholder="Search by PO Number, Vendor..."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
