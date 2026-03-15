"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface ClientPO {
  id: string;
  cpoNo: string;
  cpoDate: string;
  clientPoNumber: string;
  clientPoDate: string | null;
  projectName: string | null;
  currency: string;
  grandTotal: number | null;
  status: string;
  customer: { id: string; name: string; city: string | null };
  quotation: { id: string; quotationNo: string };
  createdBy: { name: string } | null;
  items: any[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  REGISTERED: "default",
  PARTIALLY_FULFILLED: "outline",
  FULLY_FULFILLED: "default",
  CANCELLED: "destructive",
};

export default function ClientPurchaseOrdersPage() {
  const router = useRouter();
  const [clientPOs, setClientPOs] = useState<ClientPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchClientPOs();
  }, [search, statusFilter]);

  const fetchClientPOs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/client-purchase-orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setClientPOs(data.clientPOs || []);
      }
    } catch (error) {
      console.error("Failed to fetch client POs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Purchase Orders"
        description="Register and track client purchase orders against quotations"
      >
        <Button onClick={() => router.push("/client-purchase-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Register Client P.O.
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by CPO No, Client PO No, Customer, Quotation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="PARTIALLY_FULFILLED">Partially Fulfilled</SelectItem>
                <SelectItem value="FULLY_FULFILLED">Fully Fulfilled</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <PageLoading />
          ) : clientPOs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No client purchase orders found. Click "Register Client P.O." to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPO No.</TableHead>
                    <TableHead>Client P.O. No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Ref. Quotation</TableHead>
                    <TableHead>P.O. Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPOs.map((cpo) => (
                    <TableRow key={cpo.id}>
                      <TableCell className="font-medium">{cpo.cpoNo}</TableCell>
                      <TableCell>{cpo.clientPoNumber}</TableCell>
                      <TableCell>
                        {cpo.customer.name}
                        {cpo.customer.city && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({cpo.customer.city})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => router.push(`/quotations/${cpo.quotation.id}`)}
                        >
                          {cpo.quotation.quotationNo}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {cpo.clientPoDate
                          ? format(new Date(cpo.clientPoDate), "dd/MM/yyyy")
                          : format(new Date(cpo.cpoDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{cpo.projectName || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {cpo.currency === "INR" ? "\u20B9" : cpo.currency}{" "}
                        {cpo.grandTotal
                          ? Number(cpo.grandTotal).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>{cpo.items.length}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (STATUS_COLORS[cpo.status] as any) || "secondary"
                          }
                        >
                          {cpo.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/client-purchase-orders/${cpo.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
