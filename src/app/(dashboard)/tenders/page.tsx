"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Clock, AlertTriangle, Trophy, FileText } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface Tender {
  id: string;
  tenderNo: string;
  organization: string | null;
  projectName: string | null;
  tenderSource: string | null;
  closingDate: string | null;
  emdRequired: boolean;
  emdAmount: number | null;
  estimatedValue: number | null;
  currency: string;
  status: string;
  _count: { items: number; documents: number };
}

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return "N/A";
  const symbol = currency === "INR" ? "₹" : currency;
  if (amount >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(2)}L`;
  }
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: "Identified",
  DOCUMENT_PURCHASED: "Doc Purchased",
  BID_PREPARATION: "Bid Prep",
  SUBMITTED: "Submitted",
  OPENED: "Opened",
  WON: "Won",
  LOST: "Lost",
  NO_BID: "No Bid",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;

  if (status === "WON") {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
        {label}
      </Badge>
    );
  }
  if (status === "LOST") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (status === "IDENTIFIED" || status === "NO_BID") {
    return <Badge variant="secondary">{label}</Badge>;
  }
  if (status === "DOCUMENT_PURCHASED" || status === "BID_PREPARATION") {
    return <Badge variant="outline">{label}</Badge>;
  }
  // SUBMITTED, OPENED
  return <Badge variant="default">{label}</Badge>;
}

export default function TendersPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenders() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/tenders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTenders(data);
        }
      } catch (err) {
        console.error("Failed to fetch tenders:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTenders();
  }, [search, statusFilter]);

  const summary = useMemo(() => {
    const total = tenders.length;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingDeadlines = tenders.filter((t) => {
      if (!t.closingDate) return false;
      const closing = new Date(t.closingDate);
      return closing >= now && closing <= sevenDaysLater;
    }).length;

    const submitted = tenders.filter(
      (t) => t.status === "SUBMITTED" || t.status === "OPENED"
    ).length;

    const won = tenders.filter((t) => t.status === "WON").length;

    return { total, upcomingDeadlines, submitted, won };
  }, [tenders]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tender Register"
        description="Track tenders from identification to outcome"
      >
        <Button onClick={() => router.push("/tenders/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tender
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tenders</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-orange-100 p-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
              <p className="text-2xl font-bold">{summary.upcomingDeadlines}</p>
              <p className="text-xs text-muted-foreground">closing within 7 days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-2xl font-bold">{summary.submitted}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Won</p>
              <p className="text-2xl font-bold">{summary.won}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tender no, organization, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IDENTIFIED">Identified</SelectItem>
            <SelectItem value="DOCUMENT_PURCHASED">Doc Purchased</SelectItem>
            <SelectItem value="BID_PREPARATION">Bid Preparation</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="OPENED">Opened</SelectItem>
            <SelectItem value="WON">Won</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
            <SelectItem value="NO_BID">No Bid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tender No</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Closing Date</TableHead>
                <TableHead>EMD</TableHead>
                <TableHead>Est. Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No tenders found.
                  </TableCell>
                </TableRow>
              ) : (
                tenders.map((tender) => (
                  <TableRow
                    key={tender.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/tenders/${tender.id}`)}
                  >
                    <TableCell className="font-medium">{tender.tenderNo}</TableCell>
                    <TableCell>{tender.organization ?? "-"}</TableCell>
                    <TableCell>{tender.projectName ?? "-"}</TableCell>
                    <TableCell>{tender.tenderSource ?? "-"}</TableCell>
                    <TableCell>
                      {tender.closingDate
                        ? format(new Date(tender.closingDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {tender.emdRequired && tender.emdAmount !== null
                        ? formatCurrency(tender.emdAmount, tender.currency)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(tender.estimatedValue, tender.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tender.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tenders/${tender.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
