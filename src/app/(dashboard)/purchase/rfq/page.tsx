"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RFQ {
  id: string;
  rfqNo: string;
  rfqDate: string;
  purchaseRequisition?: {
    prNo: string;
  };
  vendors: any[];
  submissionDeadline: string;
  status: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_RESPONDED: "bg-yellow-500",
  ALL_RESPONDED: "bg-green-500",
  CLOSED: "bg-purple-500",
};

export default function RFQListPage() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const response = await fetch("/api/purchase/rfq");
      if (response.ok) {
        const data = await response.json();
        setRfqs(data.rfqs || []);
      } else {
        toast.error("Failed to load RFQs");
      }
    } catch (error) {
      toast.error("Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<RFQ>[] = [
    {
      key: "rfqNo",
      header: "RFQ No",
      cell: (row) => (
        <span className="font-mono font-medium">{row.rfqNo}</span>
      ),
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
        <span className="font-mono text-sm">
          {row.purchaseRequisition?.prNo || "—"}
        </span>
      ),
    },
    {
      key: "vendors",
      header: "Vendors",
      cell: (row) => (
        <span>{row.vendors?.length || 0} vendor(s)</span>
      ),
    },
    {
      key: "submissionDeadline",
      header: "Deadline",
      cell: (row) =>
        row.submissionDeadline
          ? format(new Date(row.submissionDeadline), "dd MMM yyyy")
          : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={statusColors[row.status] || "bg-gray-500"}>
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
          onClick={() => router.push(`/purchase/rfq/${row.id}`)}
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
        title="Request for Quotations"
        description="Manage RFQs sent to vendors"
      >
        <Button onClick={() => router.push("/purchase/rfq/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New RFQ
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rfqs}
          searchKey="rfqNo"
          searchPlaceholder="Search by RFQ Number..."
        />
      )}
    </div>
  );
}
