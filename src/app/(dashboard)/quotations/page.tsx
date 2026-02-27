"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Eye, Download, CalendarClock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Quotation {
  id: string;
  quotationNo: string;
  quotationDate: string;
  customer: { name: string };
  quotationType: string;
  currency: string;
  status: string;
  version: number;
  grandTotal: number | null;
  preparedBy: { name: string } | null;
  dealOwner: { name: string } | null;
  nextActionDate: string | null;
  items: { amount: string }[];
  revisionTrigger: string | null;
  salesOrders: { id: string; orderNo: string }[];
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  SENT: "outline",
  WON: "default",
  LOST: "destructive",
  EXPIRED: "secondary",
  SUPERSEDED: "secondary",
  CANCELLED: "destructive",
  REVISED: "secondary",
};

const typeLabels: Record<string, string> = {
  DOMESTIC: "Domestic",
  EXPORT: "Export",
  BOM: "BOM/Project",
};

export default function QuotationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conversionFilter, setConversionFilter] = useState<string>("all");
  const [revisionFilter, setRevisionFilter] = useState<"all" | "original" | "revised">("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = async (id: string) => {
    try {
      setDownloadingId(id);
      const res = await fetch(`/api/quotations/${id}/pdf`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || "quotation.pdf";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["quotations", search, statusFilter, conversionFilter, revisionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(conversionFilter !== "all" && { conversionStatus: conversionFilter }),
        ...(revisionFilter !== "all" && { revision: revisionFilter }),
      });
      const res = await fetch(`/api/quotations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch quotations");
      return res.json();
    },
  });

  const getAmount = (quotation: Quotation) => {
    if (quotation.grandTotal != null) return Number(quotation.grandTotal);
    return quotation.items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Manage quotations with auto-calculations and PDF generation"
      />

      {/* Filters row */}
      <Tabs value={revisionFilter} onValueChange={(v) => setRevisionFilter(v as "all" | "original" | "revised")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="revised">Revisions</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[220px]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="SUPERSEDED">Superseded</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={conversionFilter} onValueChange={setConversionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Conversion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conversions</SelectItem>
                <SelectItem value="pending">Pending (No OC)</SelectItem>
                <SelectItem value="converted">Converted (OC Created)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => router.push("/quotations/create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>
      </Tabs>

      {/* Data Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Deal Owner</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead>OC Created</TableHead>
              <TableHead>Prepared By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  Loading quotations...
                </TableCell>
              </TableRow>
            ) : data?.quotations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No quotations found. Create your first quotation!
                </TableCell>
              </TableRow>
            ) : (
              data?.quotations?.map((quotation: Quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">
                    <div>
                      {quotation.quotationNo}
                      {quotation.version > 0 && (
                        <Badge variant="outline" className="ml-2">
                          Rev.{quotation.version}
                        </Badge>
                      )}
                    </div>
                    {revisionFilter === "revised" && quotation.revisionTrigger && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {quotation.revisionTrigger.replace(/_/g, " ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(quotation.quotationDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>{quotation.customer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabels[quotation.quotationType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{quotation.items.length}</TableCell>
                  <TableCell className="font-semibold">
                    {quotation.currency}{" "}
                    {getAmount(quotation).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {quotation.dealOwner?.name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {quotation.nextActionDate ? (
                      <div className={`flex items-center gap-1 ${isOverdue(quotation.nextActionDate) ? "text-destructive" : ""}`}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {format(new Date(quotation.nextActionDate), "dd MMM")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {quotation.salesOrders?.length > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {quotation.salesOrders[0].orderNo}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {quotation.preparedBy?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[quotation.status] as any}>
                      {quotation.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/quotations/${quotation.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        disabled={downloadingId === quotation.id}
                        onClick={() => handleDownloadPDF(quotation.id)}
                      >
                        <Download className={`h-4 w-4 ${downloadingId === quotation.id ? "animate-pulse" : ""}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
