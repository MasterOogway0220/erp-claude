"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, FileText, BarChart3, Send } from "lucide-react";
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

interface RFQ {
  id: string;
  rfqNo: string;
  rfqDate: string;
  purchaseRequisition?: { prNo: string };
  vendors: any[];
  submissionDeadline: string;
  status: string;
}

interface CS {
  id: string;
  csNo: string;
  csDate: string;
  rfq?: { rfqNo: string };
  purchaseRequisition?: { prNo: string };
  vendors: any[];
  status: string;
  selectedVendor?: { name: string };
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

const rfqStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_RESPONDED: "bg-yellow-500",
  ALL_RESPONDED: "bg-green-500",
  CLOSED: "bg-purple-500",
};

const csStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
};

export default function PurchasePage() {
  const router = useRouter();
  const [prs, setPRs] = useState<PR[]>([]);
  const [pos, setPOs] = useState<PO[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [css, setCss] = useState<CS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prResponse, poResponse, rfqResponse, csResponse] = await Promise.all([
        fetch("/api/purchase/requisitions"),
        fetch("/api/purchase/orders"),
        fetch("/api/purchase/rfq"),
        fetch("/api/purchase/comparative-statement"),
      ]);

      if (prResponse.ok) {
        const prData = await prResponse.json();
        setPRs(prData.purchaseRequisitions || []);
      }

      if (poResponse.ok) {
        const poData = await poResponse.json();
        setPOs(poData.purchaseOrders || []);
      }

      if (rfqResponse.ok) {
        const rfqData = await rfqResponse.json();
        setRfqs(rfqData.rfqs || []);
      }

      if (csResponse.ok) {
        const csData = await csResponse.json();
        setCss(csData.comparativeStatements || []);
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

  const rfqColumns: Column<RFQ>[] = [
    {
      key: "rfqNo",
      header: "RFQ Number",
      cell: (row) => <span className="font-mono font-medium">{row.rfqNo}</span>,
    },
    {
      key: "rfqDate",
      header: "Date",
      cell: (row) => format(new Date(row.rfqDate), "dd MMM yyyy"),
    },
    {
      key: "purchaseRequisition",
      header: "PR Reference",
      cell: (row) => (
        <span className="font-mono text-sm">{row.purchaseRequisition?.prNo || "—"}</span>
      ),
    },
    {
      key: "vendors",
      header: "Vendors",
      cell: (row) => <span>{row.vendors?.length || 0} vendor(s)</span>,
    },
    {
      key: "submissionDeadline",
      header: "Deadline",
      cell: (row) =>
        row.submissionDeadline ? format(new Date(row.submissionDeadline), "dd MMM yyyy") : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={rfqStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => router.push(`/purchase/rfq/${row.id}`)}>
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  const csColumns: Column<CS>[] = [
    {
      key: "csNo",
      header: "CS Number",
      cell: (row) => <span className="font-mono font-medium">{row.csNo}</span>,
    },
    {
      key: "csDate",
      header: "Date",
      cell: (row) => format(new Date(row.csDate), "dd MMM yyyy"),
    },
    {
      key: "rfq",
      header: "RFQ Reference",
      cell: (row) => <span className="font-mono text-sm">{row.rfq?.rfqNo || "—"}</span>,
    },
    {
      key: "purchaseRequisition",
      header: "PR Reference",
      cell: (row) => (
        <span className="font-mono text-sm">{row.purchaseRequisition?.prNo || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={csStatusColors[row.status] || "bg-gray-500"}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "selectedVendor",
      header: "Selected Vendor",
      cell: (row) => row.selectedVendor?.name || "—",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/purchase/comparative-statement/${row.id}`)}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
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
          <Button onClick={() => router.push("/purchase/rfq/create")} variant="outline">
            <Send className="w-4 h-4 mr-2" />
            New RFQ
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
          <TabsTrigger value="rfq">
            RFQ ({rfqs.length})
          </TabsTrigger>
          <TabsTrigger value="comparative">
            Comparative Statements ({css.length})
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

        <TabsContent value="rfq" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={rfqColumns}
              data={rfqs}
              searchKey="rfqNo"
              searchPlaceholder="Search by RFQ Number..."
            />
          )}
        </TabsContent>

        <TabsContent value="comparative" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={csColumns}
              data={css}
              searchKey="csNo"
              searchPlaceholder="Search by CS Number..."
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
