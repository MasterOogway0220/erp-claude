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
import { Plus, Search, Eye, FileText } from "lucide-react";
import { format } from "date-fns";

interface Quotation {
  id: string;
  quotationNo: string;
  quotationDate: string;
  customer: {
    name: string;
  };
  quotationType: string;
  currency: string;
  status: string;
  version: number;
  preparedBy: {
    name: string;
  } | null;
  items: any[];
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  SENT: "outline",
  WON: "default",
  LOST: "destructive",
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

  // Fetch quotations
  const { data, isLoading } = useQuery({
    queryKey: ["quotations", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/quotations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch quotations");
      return res.json();
    },
  });

  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Manage quotations with auto-calculations and PDF generation"
      />

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="WON">Won</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/quotations/create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

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
              <TableHead>Prepared By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading quotations...
                </TableCell>
              </TableRow>
            ) : data?.quotations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No quotations found. Create your first quotation!
                </TableCell>
              </TableRow>
            ) : (
              data?.quotations?.map((quotation: Quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">
                    {quotation.quotationNo}
                    {quotation.version > 1 && (
                      <Badge variant="outline" className="ml-2">
                        Rev.{quotation.version}
                      </Badge>
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
                    {quotation.currency} {calculateTotal(quotation.items).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {quotation.preparedBy?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[quotation.status] as any}>
                      {quotation.status.replace("_", " ")}
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
                        title="Generate PDF (Coming soon)"
                      >
                        <FileText className="h-4 w-4" />
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
