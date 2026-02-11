"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, FileText, Search, Eye } from "lucide-react";
import { format } from "date-fns";

interface Enquiry {
  id: string;
  enquiryNo: string;
  enquiryDate: string;
  customer: {
    name: string;
  };
  buyerName: string | null;
  projectName: string | null;
  status: string;
  items: any[];
  _count: {
    quotations: number;
  };
}

const statusColors: Record<string, string> = {
  OPEN: "default",
  QUOTATION_PREPARED: "secondary",
  WON: "default",
  LOST: "destructive",
  CANCELLED: "outline",
};

export default function EnquiriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch enquiries
  const { data, isLoading } = useQuery({
    queryKey: ["enquiries", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/enquiries?${params}`);
      if (!res.ok) throw new Error("Failed to fetch enquiries");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Manage customer enquiries and create quotations"
      />

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search enquiries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="QUOTATION_PREPARED">Quotation Prepared</SelectItem>
              <SelectItem value="WON">Won</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/enquiries/create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Enquiry
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enquiry No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Buyer Name</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Quotations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading enquiries...
                </TableCell>
              </TableRow>
            ) : data?.enquiries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No enquiries found
                </TableCell>
              </TableRow>
            ) : (
              data?.enquiries?.map((enquiry: Enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell className="font-medium">{enquiry.enquiryNo}</TableCell>
                  <TableCell>
                    {format(new Date(enquiry.enquiryDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>{enquiry.customer.name}</TableCell>
                  <TableCell>{enquiry.buyerName || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {enquiry.projectName || "—"}
                  </TableCell>
                  <TableCell>{enquiry.items.length}</TableCell>
                  <TableCell>
                    {enquiry._count.quotations > 0 ? (
                      <Badge variant="outline">{enquiry._count.quotations}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[enquiry.status] as any}>
                      {enquiry.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/enquiries/${enquiry.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/quotations/create?enquiryId=${enquiry.id}`)
                        }
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
