"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  FileText,
  Search,
  Eye,
  Inbox,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
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

const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  QUOTATION_PREPARED: {
    label: "Quotation Prepared",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  WON: {
    label: "Won",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  LOST: {
    label: "Lost",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        {isLoading ? (
          <Skeleton className="h-6 w-10 mt-0.5" />
        ) : (
          <p className="text-xl font-semibold tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function EnquiriesPage() {
  const router = useRouter();
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

  const enquiries: Enquiry[] = data?.enquiries ?? [];

  // Compute stats from the data
  const stats = useMemo(() => {
    return {
      total: enquiries.length,
      open: enquiries.filter((e) => e.status === "OPEN").length,
      quotationPrepared: enquiries.filter((e) => e.status === "QUOTATION_PREPARED").length,
      won: enquiries.filter((e) => e.status === "WON").length,
      lost: enquiries.filter((e) => e.status === "LOST").length,
    };
  }, [enquiries]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Manage customer enquiries and track their progress through quotations"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Enquiries"
          value={stats.total}
          icon={ClipboardList}
          color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          isLoading={isLoading}
        />
        <StatCard
          label="Open"
          value={stats.open}
          icon={Clock}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
          isLoading={isLoading}
        />
        <StatCard
          label="Quotation Prepared"
          value={stats.quotationPrepared}
          icon={FileText}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
          isLoading={isLoading}
        />
        <StatCard
          label="Won"
          value={stats.won}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300"
          isLoading={isLoading}
        />
        <StatCard
          label="Lost"
          value={stats.lost}
          icon={XCircle}
          color="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
          isLoading={isLoading}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by enquiry no, customer, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="QUOTATION_PREPARED">Quotation Prepared</SelectItem>
              <SelectItem value="WON">Won</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/enquiries/create")} className="h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Enquiry No.</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Buyer</TableHead>
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold text-center">Items</TableHead>
              <TableHead className="font-semibold text-center">Quotations</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : enquiries.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                      <Inbox className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold">No enquiries found</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your search or filter criteria to find what you're looking for."
                        : "Get started by creating your first customer enquiry."}
                    </p>
                    {!search && statusFilter === "all" && (
                      <Button
                        onClick={() => router.push("/enquiries/create")}
                        className="mt-4 gap-1.5"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        Create Enquiry
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enquiries.map((enquiry) => {
                const status = statusConfig[enquiry.status] ?? {
                  label: enquiry.status,
                  className: "bg-gray-50 text-gray-600 border-gray-200",
                };
                return (
                  <TableRow
                    key={enquiry.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/enquiries/${enquiry.id}`)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        {enquiry.enquiryNo}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(enquiry.enquiryDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{enquiry.customer.name}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {enquiry.buyerName || <span className="text-muted-foreground/50">--</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm truncate block" title={enquiry.projectName || undefined}>
                        {enquiry.projectName || <span className="text-muted-foreground/50">--</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm tabular-nums">{enquiry.items.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {enquiry._count.quotations > 0 ? (
                        <Badge variant="outline" className="tabular-nums text-xs">
                          {enquiry._count.quotations}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/50">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border ${status.className}`}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => router.push(`/enquiries/${enquiry.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Enquiry</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  router.push(`/quotations/create?enquiryId=${enquiry.id}`)
                                }
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create Quotation</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
