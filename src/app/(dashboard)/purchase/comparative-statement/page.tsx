"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ComparativeStatement {
  id: string;
  csNo: string;
  csDate: string;
  rfq?: {
    rfqNo: string;
  };
  purchaseRequisition?: {
    prNo: string;
  };
  vendors: any[];
  status: string;
  selectedVendor?: {
    name: string;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
};

export default function ComparativeStatementListPage() {
  const router = useRouter();
  const [statements, setStatements] = useState<ComparativeStatement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      const response = await fetch("/api/purchase/comparative-statement");
      if (response.ok) {
        const data = await response.json();
        setStatements(data.comparativeStatements || []);
      } else {
        toast.error("Failed to load comparative statements");
      }
    } catch (error) {
      toast.error("Failed to load comparative statements");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<ComparativeStatement>[] = [
    {
      key: "csNo",
      header: "CS No",
      cell: (row) => (
        <span className="font-mono font-medium">{row.csNo}</span>
      ),
    },
    {
      key: "csDate",
      header: "Date",
      cell: (row) => format(new Date(row.csDate), "dd MMM yyyy"),
    },
    {
      key: "rfq",
      header: "RFQ Reference",
      cell: (row) => (
        <span className="font-mono text-sm">{row.rfq?.rfqNo || "—"}</span>
      ),
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
      cell: (row) => <span>{row.vendors?.length || 0}</span>,
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
          onClick={() =>
            router.push(`/purchase/comparative-statement/${row.id}`)
          }
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
        title="Comparative Statements"
        description="View and manage vendor comparison statements"
      />

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
          data={statements}
          searchKey="csNo"
          searchPlaceholder="Search by CS Number..."
        />
      )}
    </div>
  );
}
