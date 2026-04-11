"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { SQ_STATUSES } from "@/lib/constants/supplier-quotations";

interface SupplierQuotation {
  id: string;
  sqNo: string;
  sqDate: string;
  vendor: { id: string; name: string };
  vendorRef: string | null;
  grandTotal: string | null;
  status: string;
  _count: { items: number };
}

const statusBadgeVariant: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  RECEIVED: "default",
  UNDER_REVIEW: "outline",
  COMPARED: "outline",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "secondary",
};

const statusBadgeClass: Record<string, string> = {
  ACCEPTED: "bg-green-600 text-white hover:bg-green-700",
};

export default function SupplierQuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<SupplierQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const res = await fetch("/api/purchase/supplier-quotations");
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.supplierQuotations || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = quotations.filter((sq) => {
    const matchesSearch =
      !search ||
      sq.sqNo.toLowerCase().includes(search.toLowerCase()) ||
      sq.vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      (sq.vendorRef?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || sq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Quotations"
        description="Manage quotations received from vendors"
      >
        <Button onClick={() => router.push("/purchase/supplier-quotations/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Create
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by SQ No, vendor, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {SQ_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SQ No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Vendor Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No supplier quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sq) => (
                  <TableRow
                    key={sq.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/purchase/supplier-quotations/${sq.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{sq.sqNo}</TableCell>
                    <TableCell>{sq.vendor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{sq.vendorRef || "—"}</TableCell>
                    <TableCell>{format(new Date(sq.sqDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-center">{sq._count.items}</TableCell>
                    <TableCell className="text-right font-mono">
                      {sq.grandTotal
                        ? `₹ ${parseFloat(sq.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant[sq.status] ?? "secondary"}
                        className={statusBadgeClass[sq.status] ?? ""}
                      >
                        {SQ_STATUSES.find((s) => s.value === sq.status)?.label ?? sq.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/purchase/supplier-quotations/${sq.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
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
