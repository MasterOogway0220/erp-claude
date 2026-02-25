"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

const verificationStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  VERIFIED: "bg-green-500",
  DISCREPANT: "bg-red-500",
};

export default function MTCListPage() {
  const [mtcs, setMtcs] = useState<any[]>([]);
  const [mtcSearch, setMtcSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMTCs();
  }, []);

  const fetchMTCs = async (search?: string) => {
    try {
      const url = search
        ? `/api/quality/mtc?search=${encodeURIComponent(search)}`
        : "/api/quality/mtc";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMtcs(data.mtcDocuments || []);
      }
    } catch (error) {
      console.error("Failed to fetch MTCs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMtcSearch = () => {
    fetchMTCs(mtcSearch);
  };

  const handleMtcVerificationUpdate = async (mtcId: string, verificationStatus: string) => {
    try {
      const response = await fetch(`/api/quality/mtc/${mtcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (response.ok) {
        toast.success(`MTC verification status updated to ${verificationStatus}`);
        fetchMTCs(mtcSearch || undefined);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update verification status");
      }
    } catch (error) {
      toast.error("Failed to update verification status");
    }
  };

  const mtcColumns: Column<any>[] = [
    {
      key: "mtcNo",
      header: "MTC No.",
      cell: (row) => <span className="font-mono text-sm">{row.mtcNo as string}</span>,
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "product",
      header: "Product / Size",
      cell: (row) => {
        const stock = row.inventoryStock as any;
        return stock ? `${stock.product || ""} ${stock.sizeLabel || ""}`.trim() || "—" : "—";
      },
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.purchaseOrder as any)?.vendor?.name || "—",
    },
    {
      key: "purchaseOrder",
      header: "PO",
      cell: (row) => {
        const po = row.purchaseOrder as any;
        return po ? (
          <Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline text-sm">
            {po.poNo}
          </Link>
        ) : (
          "—"
        );
      },
    },
    {
      key: "grn",
      header: "GRN",
      cell: (row) => {
        const grn = row.grn as any;
        return grn ? (
          <Link href={`/inventory/grn/${grn.id}`} className="text-blue-600 hover:underline text-sm">
            {grn.grnNo}
          </Link>
        ) : (
          "—"
        );
      },
    },
    {
      key: "verificationStatus",
      header: "Verification Status",
      cell: (row) => {
        const status = (row.verificationStatus as string) || "PENDING";
        return (
          <Select
            value={status}
            onValueChange={(value) => handleMtcVerificationUpdate(row.id as string, value)}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <Badge className={`${verificationStatusColors[status] || "bg-gray-500"} text-xs`}>
                {status}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="DISCREPANT">Discrepant</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "uploadDate",
      header: "Upload Date",
      cell: (row) => format(new Date(row.uploadDate as string), "dd MMM yyyy"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="MTC Repository" description="Mill Test Certificate documents" />

      <div className="flex gap-2">
        <Input
          placeholder="Search by MTC number or heat number..."
          value={mtcSearch}
          onChange={(e) => setMtcSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMtcSearch()}
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={handleMtcSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        {mtcSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMtcSearch("");
              fetchMTCs();
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={mtcColumns}
        data={mtcs}
        searchKey="mtcNo"
        searchPlaceholder="Filter results..."
      />
    </div>
  );
}
