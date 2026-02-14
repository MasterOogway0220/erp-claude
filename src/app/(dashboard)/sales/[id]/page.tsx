"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, FileSearch, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface SalesOrder {
  id: string;
  soNo: string;
  soDate: string;
  customer: {
    id: string;
    name: string;
    address: string;
    city?: string;
  };
  quotation?: {
    id: string;
    quotationNo: string;
  };
  customerPoNo?: string;
  customerPoDate?: string;
  customerPoDocument?: string;
  poAcceptanceStatus: string;
  status: string;
  items: Array<{
    id: string;
    sNo: number;
    product: string;
    material: string;
    additionalSpec?: string;
    sizeLabel: string;
    od: number;
    wt: number;
    ends?: string;
    quantity: number;
    unitRate: number;
    amount: number;
    deliveryDate?: string;
    stockReservations?: Array<{
      id: string;
      reservedQtyMtr: number;
      inventoryStock: {
        heatNo: string;
        availableQtyMtr: number;
      };
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

const soStatusColors: Record<string, string> = {
  OPEN: "bg-blue-500",
  PARTIALLY_DISPATCHED: "bg-yellow-500",
  FULLY_DISPATCHED: "bg-green-500",
  CLOSED: "bg-gray-500",
};

const poAcceptanceColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
};

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchSalesOrder(params.id as string);
    }
  }, [params.id]);

  const fetchSalesOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/sales-orders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSalesOrder(data.salesOrder);
    } catch (error) {
      toast.error("Failed to load sales order");
      router.push("/sales");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!salesOrder) {
    return null;
  }

  const totalAmount = salesOrder.items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales Order: ${salesOrder.soNo}`}
        description={`Created on ${format(new Date(salesOrder.soDate), "dd MMM yyyy")}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {salesOrder.poAcceptanceStatus === "PENDING" && (
            <Button onClick={() => router.push(`/sales/${salesOrder.id}/review`)}>
              <FileText className="w-4 h-4 mr-2" />
              Review Customer PO
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/sales/${salesOrder.id}/reserve-stock`)}
          >
            <Package className="w-4 h-4 mr-2" />
            Reserve Stock
          </Button>
        </div>
      </PageHeader>

      {salesOrder.poAcceptanceStatus === "PENDING" && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Customer PO Review Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    This Sales Order requires Customer PO verification per ISO 9001:2018 Clause 8.2.3.
                    Please review the customer PO against the reference quotation before proceeding.
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push(`/sales/${salesOrder.id}/review`)}>
                <FileSearch className="w-4 h-4 mr-2" />
                Review PO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">SO Number</div>
                <div className="font-mono font-medium">{salesOrder.soNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">SO Date</div>
                <div>{format(new Date(salesOrder.soDate), "dd MMM yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">SO Status</div>
                <Badge className={soStatusColors[salesOrder.status]}>
                  {salesOrder.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PO Acceptance</div>
                <Badge className={poAcceptanceColors[salesOrder.poAcceptanceStatus]}>
                  {salesOrder.poAcceptanceStatus}
                </Badge>
              </div>
            </div>

            {salesOrder.quotation && (
              <div>
                <div className="text-sm text-muted-foreground">Reference Quotation</div>
                <div className="font-mono">{salesOrder.quotation.quotationNo}</div>
              </div>
            )}

            {salesOrder.customerPoNo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Customer PO Number</div>
                  <div className="font-mono">{salesOrder.customerPoNo}</div>
                </div>
                {salesOrder.customerPoDate && (
                  <div>
                    <div className="text-sm text-muted-foreground">Customer PO Date</div>
                    <div>{format(new Date(salesOrder.customerPoDate), "dd MMM yyyy")}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm text-muted-foreground">Customer City</div>
              <div>{salesOrder.customer.city || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Customer Name</div>
              <div className="font-medium">{salesOrder.customer.name}</div>
            </div>
            {salesOrder.customer.address && (
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="text-sm">{salesOrder.customer.address}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Qty (Mtr)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Reserved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesOrder.items.map((item) => {
                const reservedQty = item.stockReservations?.reduce(
                  (sum, res) => sum + Number(res.reservedQtyMtr),
                  0
                ) || 0;
                const shortfall = Number(item.quantity) - reservedQty;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sizeLabel}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toFixed(3)}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unitRate).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(item.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.deliveryDate
                        ? format(new Date(item.deliveryDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div
                          className={
                            shortfall > 0 ? "text-yellow-600 font-medium" : "text-green-600"
                          }
                        >
                          {reservedQty.toFixed(3)} Mtr
                        </div>
                        {shortfall > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Shortfall: {shortfall.toFixed(3)} Mtr
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {salesOrder.items.some(
        (item) =>
          Number(item.quantity) -
          (item.stockReservations?.reduce(
            (sum, res) => sum + Number(res.reservedQtyMtr),
            0
          ) || 0) >
          0
      ) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900">Stock Reservation Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Some items have shortfall in stock reservation. Click "Reserve Stock" to
                  allocate inventory or generate Purchase Requisition for shortfall.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
