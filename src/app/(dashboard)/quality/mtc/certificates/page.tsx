"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Eye, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/page-loading";

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  DRAFT: { variant: "secondary" },
  FINALIZED: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
  REVISED: { variant: "default", className: "bg-yellow-500 hover:bg-yellow-600" },
  CANCELLED: { variant: "destructive" },
};

export default function MTCCertificatesListPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await fetch("/api/mtc/certificates");
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error("Failed to fetch MTC certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "certificateNo",
      header: "Certificate No",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/quality/mtc/certificates/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline font-medium"
        >
          {row.certificateNo}
        </Link>
      ),
    },
    {
      key: "certificateDate",
      header: "Date",
      sortable: true,
      cell: (row) => format(new Date(row.certificateDate), "dd MMM yyyy"),
    },
    {
      key: "issuedAgainst",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">
          {row.issuedAgainst === "PURCHASE_ORDER" ? "PO" : "Quotation"}
        </Badge>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <span className="text-sm">{row.customer?.name || row.customerName || "—"}</span>
      ),
    },
    {
      key: "materialSpec",
      header: "Material Spec",
      cell: (row) => (
        <span className="text-sm font-mono">
          {row.materialSpec || row.materialSpecRef?.materialSpec || "—"}
        </span>
      ),
    },
    {
      key: "poNo",
      header: "PO/Quotation Ref",
      cell: (row) => (
        <span className="text-sm font-mono">
          {row.poNo || row.quotationNo || "—"}
        </span>
      ),
    },
    {
      key: "_count",
      header: "Items",
      cell: (row) => (
        <Badge variant="secondary">{row._count?.items || 0}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const config = statusColors[row.status] || statusColors.DRAFT;
        return (
          <Badge variant={config.variant} className={config.className}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/quality/mtc/certificates/${row.id}`)}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(`/api/mtc/certificates/${row.id}/pdf`, "_blank")}
            title="PDF"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MTC Certificates"
        description="Mill Test Certificates for quality traceability"
      >
        <Button onClick={() => router.push("/quality/mtc/certificates/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Create MTC
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={certificates}
        searchKey="certificateNo"
        searchPlaceholder="Search by certificate number..."
      />
    </div>
  );
}
