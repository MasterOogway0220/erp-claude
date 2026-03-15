"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileCheck, Eye } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface POAcceptanceItem {
  id: string;
  acceptanceNo: string;
  acceptanceDate: string;
  committedDeliveryDate: string;
  status: string;
  createdAt: string;
  followUpName: string | null;
  qualityName: string | null;
  accountsName: string | null;
  clientPurchaseOrder: {
    cpoNo: string;
    clientPoNumber: string;
    grandTotal: number | null;
    currency: string;
    customer: { id: string; name: string; city: string | null };
    quotation: { id: string; quotationNo: string };
  };
  createdBy: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  ISSUED: "default",
  CANCELLED: "destructive",
};

export default function POAcceptanceListPage() {
  const router = useRouter();
  const [acceptances, setAcceptances] = useState<POAcceptanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchAcceptances = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/po-acceptance?${params}`);
      if (response.ok) {
        setAcceptances(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAcceptances();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="P.O. Acceptance Register"
        description="Track and manage Purchase Order Acceptance documents"
      >
        <Button onClick={() => router.push("/po-acceptance/create")}>
          <FileCheck className="w-4 h-4 mr-2" />
          New Acceptance
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by acceptance no, CPO no, client name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acceptance No</TableHead>
                <TableHead>CPO No</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Client PO</TableHead>
                <TableHead>Acceptance Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acceptances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No PO acceptances found.
                  </TableCell>
                </TableRow>
              ) : (
                acceptances.map((a) => {
                  const cpo = a.clientPurchaseOrder;
                  const symbol = cpo.currency === "INR" ? "\u20B9" : cpo.currency;
                  return (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/po-acceptance/${a.id}`)}
                    >
                      <TableCell className="font-medium">{a.acceptanceNo}</TableCell>
                      <TableCell className="text-sm">{cpo.cpoNo}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{cpo.customer.name}</div>
                          {cpo.customer.city && (
                            <div className="text-xs text-muted-foreground">{cpo.customer.city}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{cpo.clientPoNumber}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(a.acceptanceDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(a.committedDeliveryDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {cpo.grandTotal
                          ? `${symbol} ${cpo.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[a.status] as any}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/po-acceptance/${a.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
