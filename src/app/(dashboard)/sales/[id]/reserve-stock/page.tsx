"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Package, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface SOItem {
  id: string;
  sNo: number;
  product: string;
  material: string;
  sizeLabel: string;
  quantity: number;
  stockReservations?: Array<{
    id: string;
    reservedQtyMtr: number;
    inventoryStock: {
      heatNo: string;
    };
  }>;
}

interface SalesOrder {
  id: string;
  soNo: string;
  customer: {
    name: string;
  };
  items: SOItem[];
}

interface AvailableStock {
  id: string;
  heatNo: string;
  product: string;
  material: string;
  sizeLabel: string;
  quantityMtr: number;
  pieces: number;
  mtcDate: string;
  mtcNo: string;
  vendor: {
    name: string;
  };
}

export default function ReserveStockPage() {
  const router = useRouter();
  const params = useParams();
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [selectedItem, setSelectedItem] = useState<SOItem | null>(null);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const fetchAvailableStock = async (itemId: string) => {
    setLoadingStock(true);
    try {
      const response = await fetch(
        `/api/sales-orders/${params.id}/reserve?soItemId=${itemId}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAvailableStock(data.availableStock || []);
    } catch (error) {
      toast.error("Failed to load available stock");
    } finally {
      setLoadingStock(false);
    }
  };

  const handleOpenReservationDialog = (item: SOItem) => {
    setSelectedItem(item);
    fetchAvailableStock(item.id);
    setDialogOpen(true);
  };

  const handleReserveStock = async (stockId: string, qtyToReserve: number) => {
    if (!selectedItem) return;

    setReserving(true);
    try {
      const response = await fetch(`/api/sales-orders/${params.id}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soItemId: selectedItem.id,
          inventoryStockId: stockId,
          reservedQtyMtr: qtyToReserve,
          reservedPieces: 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reserve stock");
      }

      toast.success("Stock reserved successfully");
      setDialogOpen(false);
      fetchSalesOrder(params.id as string);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!salesOrder) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserve Inventory Stock"
        description={`Allocate inventory against SO: ${salesOrder.soNo}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Sales Order Items & Reservation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Required Qty</TableHead>
                <TableHead className="text-right">Reserved Qty</TableHead>
                <TableHead className="text-right">Shortfall</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesOrder.items.map((item) => {
                const reservedQty =
                  item.stockReservations?.reduce(
                    (sum, res) => sum + Number(res.reservedQtyMtr),
                    0
                  ) || 0;
                const shortfall = Number(item.quantity) - reservedQty;
                const isFullyReserved = shortfall <= 0.001;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sizeLabel}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {reservedQty.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isFullyReserved ? "text-green-600" : "text-yellow-600 font-medium"
                        }
                      >
                        {shortfall.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isFullyReserved ? (
                        <Badge className="bg-green-500">Fully Reserved</Badge>
                      ) : reservedQty > 0 ? (
                        <Badge className="bg-yellow-500">Partially Reserved</Badge>
                      ) : (
                        <Badge className="bg-gray-500">Not Reserved</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isFullyReserved && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenReservationDialog(item)}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Reserve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {salesOrder.items.every((item) => {
            const reservedQty =
              item.stockReservations?.reduce(
                (sum, res) => sum + Number(res.reservedQtyMtr),
                0
              ) || 0;
            return Number(item.quantity) - reservedQty <= 0.001;
          }) && (
            <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">
                    All Items Fully Reserved
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    All sales order items have been allocated with inventory stock.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reserve Inventory for Item #{selectedItem?.sNo}</DialogTitle>
            <DialogDescription>
              Product: {selectedItem?.product} | Material: {selectedItem?.material} | Size:{" "}
              {selectedItem?.sizeLabel}
            </DialogDescription>
          </DialogHeader>

          {loadingStock ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading available stock...
            </div>
          ) : availableStock.length === 0 ? (
            <div className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No matching stock available</p>
                <p className="text-sm mt-2">
                  Consider creating a Purchase Requisition for this item.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Available stock sorted by FIFO (oldest MTC date first)
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heat No</TableHead>
                    <TableHead>MTC No</TableHead>
                    <TableHead>MTC Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead>Reserve Qty</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableStock.map((stock) => {
                    const [qtyInput, setQtyInput] = useState(
                      Math.min(
                        Number(stock.quantityMtr),
                        selectedItem
                          ? Number(selectedItem.quantity) -
                            (selectedItem.stockReservations?.reduce(
                              (sum, res) => sum + Number(res.reservedQtyMtr),
                              0
                            ) || 0)
                          : 0
                      ).toFixed(3)
                    );

                    return (
                      <TableRow key={stock.id}>
                        <TableCell className="font-mono font-medium">
                          {stock.heatNo}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{stock.mtcNo}</TableCell>
                        <TableCell>
                          {format(new Date(stock.mtcDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">{stock.vendor.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(stock.quantityMtr).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">{stock.pieces}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            max={stock.quantityMtr}
                            defaultValue={qtyInput}
                            onChange={(e) => setQtyInput(e.target.value)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleReserveStock(stock.id, parseFloat(qtyInput))
                            }
                            disabled={reserving}
                          >
                            Reserve
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
