"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ncrStatusColors: Record<string, string> = {
  OPEN: "bg-red-500",
  UNDER_INVESTIGATION: "bg-yellow-500",
  CLOSED: "bg-green-500",
  VERIFIED: "bg-blue-500",
};

export default function NCRListPage() {
  const router = useRouter();
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNCRs();
  }, []);

  const fetchNCRs = async () => {
    try {
      const response = await fetch("/api/quality/ncr");
      if (response.ok) {
        const data = await response.json();
        setNcrs(data.ncrs || []);
      }
    } catch (error) {
      console.error("Failed to fetch NCRs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNcrs =
    statusFilter === "ALL"
      ? ncrs
      : ncrs.filter((n) => n.status === statusFilter);

  const ncrColumns: Column<any>[] = [
    {
      key: "ncrNo",
      header: "NCR No.",
      cell: (row) => (
        <Link
          href={`/quality/ncr/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.ncrNo as string}
        </Link>
      ),
    },
    {
      key: "ncrDate",
      header: "Date",
      cell: (row) => format(new Date(row.ncrDate as string), "dd MMM yyyy"),
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "nonConformanceType",
      header: "Type",
      cell: (row) => (row.nonConformanceType as string)?.replace(/_/g, " ") || "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.vendor as any)?.name || "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={ncrStatusColors[row.status as string] || "bg-gray-500"}>
          {(row.status as string).replace(/_/g, " ")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="NCR Register" description="Non-Conformance Reports">
        <Button onClick={() => router.push("/quality/ncr/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New NCR
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={ncrColumns}
        data={filteredNcrs}
        searchKey="ncrNo"
        searchPlaceholder="Search by NCR number..."
      />
    </div>
  );
}
