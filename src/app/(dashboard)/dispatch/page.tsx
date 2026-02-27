"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

const plStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PACKED: "bg-blue-500",
  DISPATCHED: "bg-green-500",
};

const invoiceTypeColors: Record<string, string> = {
  DOMESTIC: "bg-blue-500",
  EXPORT: "bg-purple-500",
  PROFORMA: "bg-yellow-500",
  CREDIT_NOTE: "bg-orange-500",
  DEBIT_NOTE: "bg-red-500",
};

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_PAID: "bg-yellow-500",
  PAID: "bg-green-500",
  CANCELLED: "bg-red-500",
};

function DispatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = ["packing-lists", "dispatch-notes", "invoices", "payments"].includes(tabParam || "")
    ? tabParam!
    : "packing-lists";

  const [packingLists, setPackingLists] = useState<any[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plRes, dnRes, invRes, payRes] = await Promise.all([
        fetch("/api/dispatch/packing-lists"),
        fetch("/api/dispatch/dispatch-notes"),
        fetch("/api/dispatch/invoices"),
        fetch("/api/dispatch/payments"),
      ]);

      if (plRes.ok) {
        const data = await plRes.json();
        setPackingLists(data.packingLists || []);
      }
      if (dnRes.ok) {
        const data = await dnRes.json();
        setDispatchNotes(data.dispatchNotes || []);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(data.invoices || []);
      }
      if (payRes.ok) {
        const data = await payRes.json();
        setPayments(data.paymentReceipts || []);
      }
    } catch (error) {
      toast.error("Failed to load dispatch data");
    } finally {
      setLoading(false);
    }
  };

  const plColumns: Column<any>[] = [
    {
      key: "plNo",
      header: "PL Number",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/dispatch/packing-lists/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.plNo as string}
        </Link>
      ),
    },
    {
      key: "plDate",
      header: "Date",
      sortable: true,
      cell: (row) => format(new Date(row.plDate as string), "dd MMM yyyy"),
    },
    {
      key: "salesOrder",
      header: "SO No.",
      cell: (row) => (
        <span className="font-mono text-sm">
          {(row.salesOrder as any)?.soNo || "---"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => <span>{(row.items as any[])?.length || 0} item(s)</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const hasDN = (row.dispatchNotes as any[])?.length > 0;
        const status = hasDN ? "DISPATCHED" : "PACKED";
        return (
          <Badge className={plStatusColors[status] || "bg-gray-500"}>
            {status}
          </Badge>
        );
      },
    },
  ];

  const dnColumns: Column<any>[] = [
    {
      key: "dnNo",
      header: "DN Number",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/dispatch/dispatch-notes/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.dnNo as string}
        </Link>
      ),
    },
    {
      key: "dispatchDate",
      header: "Date",
      sortable: true,
      cell: (row) =>
        format(new Date(row.dispatchDate as string), "dd MMM yyyy"),
    },
    {
      key: "packingList",
      header: "PL No.",
      cell: (row) => (
        <Link
          href={`/dispatch/packing-lists/${(row.packingList as any)?.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {(row.packingList as any)?.plNo || "---"}
        </Link>
      ),
    },
    {
      key: "heatNos",
      header: "Heat Nos.",
      cell: (row) => {
        const items = (row.packingList as any)?.items || [];
        const heatNos = items
          .map((i: any) => i.heatNo)
          .filter((h: any) => h)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        return (
          <span className="font-mono text-xs">
            {heatNos.length > 0 ? heatNos.join(", ") : "---"}
          </span>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (row.salesOrder as any)?.customer?.name || "---",
    },
    {
      key: "vehicleNo",
      header: "Vehicle",
      cell: (row) => (row.vehicleNo as string) || "---",
    },
    {
      key: "transporter",
      header: "Transporter",
      cell: (row) => (row.transporter as any)?.name || "---",
    },
  ];

  const invoiceColumns: Column<any>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No.",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/dispatch/invoices/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.invoiceNo as string}
        </Link>
      ),
    },
    {
      key: "invoiceDate",
      header: "Date",
      sortable: true,
      cell: (row) =>
        format(new Date(row.invoiceDate as string), "dd MMM yyyy"),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="font-medium">{(row.customer as any)?.name || "---"}</div>
      ),
    },
    {
      key: "invoiceType",
      header: "Type",
      cell: (row) => (
        <Badge
          className={
            invoiceTypeColors[row.invoiceType as string] || "bg-gray-500"
          }
        >
          {(row.invoiceType as string)?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      cell: (row) => (
        <div className="text-right font-medium">
          {"\u20B9"}{Number(row.totalAmount).toFixed(2)}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          className={
            invoiceStatusColors[row.status as string] || "bg-gray-500"
          }
        >
          {(row.status as string)?.replace(/_/g, " ")}
        </Badge>
      ),
    },
  ];

  const paymentColumns: Column<any>[] = [
    {
      key: "receiptNo",
      header: "Receipt No.",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/dispatch/payments/${row.id}`}
          className="font-mono font-medium text-blue-600 hover:underline"
        >
          {row.receiptNo as string}
        </Link>
      ),
    },
    {
      key: "receiptDate",
      header: "Date",
      sortable: true,
      cell: (row) =>
        format(new Date(row.receiptDate as string), "dd MMM yyyy"),
    },
    {
      key: "invoice",
      header: "Invoice",
      cell: (row) => (
        <Link
          href={`/dispatch/invoices/${(row.invoice as any)?.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {(row.invoice as any)?.invoiceNo || "---"}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="font-medium">{(row.customer as any)?.name || "---"}</div>
      ),
    },
    {
      key: "amountReceived",
      header: "Amount",
      cell: (row) => (
        <div className="text-right font-medium">
          {"\u20B9"}{Number(row.amountReceived).toFixed(2)}
        </div>
      ),
    },
    {
      key: "paymentMode",
      header: "Mode",
      cell: (row) => (
        <Badge variant="outline">{row.paymentMode as string}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch & Finance"
        description="Packing lists, dispatch notes, invoices, and payments"
      >
        <div className="flex gap-2">
          <Button onClick={() => router.push("/dispatch/packing-lists/create")}>
            <Plus className="w-4 h-4 mr-2" />
            New Packing List
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dispatch/invoices/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="packing-lists">
            Packing Lists ({packingLists.length})
          </TabsTrigger>
          <TabsTrigger value="dispatch-notes">
            Dispatch Notes ({dispatchNotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packing-lists" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => router.push("/dispatch/packing-lists/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Packing List
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={plColumns}
              data={packingLists}
              searchKey="plNo"
              searchPlaceholder="Search by PL Number..."
            />
          )}
        </TabsContent>

        <TabsContent value="dispatch-notes" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => router.push("/dispatch/dispatch-notes/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Dispatch Note
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={dnColumns}
              data={dispatchNotes}
              searchKey="dnNo"
              searchPlaceholder="Search by DN Number..."
            />
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push("/dispatch/invoices/create")}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              searchKey="invoiceNo"
              searchPlaceholder="Search by Invoice Number..."
            />
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push("/dispatch/payments/create")}>
              <Plus className="w-4 h-4 mr-2" />
              New Payment
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            </div>
          ) : (
            <DataTable
              columns={paymentColumns}
              data={payments}
              searchKey="receiptNo"
              searchPlaceholder="Search by Receipt Number..."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-96 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        </div>
      }
    >
      <DispatchPageContent />
    </Suspense>
  );
}
