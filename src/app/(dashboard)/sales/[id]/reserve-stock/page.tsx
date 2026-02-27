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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Package, CheckCircle, AlertCircle, Trash2, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

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
    status: string;
    reservedDate: string;
    inventoryStock: {
      heatNo: string;
      mtcNo?: string;
    };
  }>;
}

interface SalesOrder {
  id: string;
  soNo: string;
  poAcceptanceStatus: string;
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
  make: string;
}

// Extracted component to avoid useState inside .map()
function StockRow({
  stock,
  defaultQty,
  reserving,
  onReserve,
}: {
  stock: AvailableStock;
  defaultQty: number;
  reserving: boolean;
  onReserve: (stockId: string, qty: number) => void;
}) {
  const [qtyInput, setQtyInput] = useState(
    Math.max(0, defaultQty).toFixed(3)
  );

  return (
    <TableRow>
      <TableCell className="font-mono font-medium">
        {stock.heatNo || "—"}
      </TableCell>
      <TableCell className="font-mono text-sm">{stock.mtcNo || "—"}</TableCell>
      <TableCell>
        {stock.mtcDate
          ? format(new Date(stock.mtcDate), "dd MMM yyyy")
          : "—"}
      </TableCell>
      <TableCell className="text-sm">{stock.make || "—"}</TableCell>
      <TableCell className="text-right font-medium">
        {Number(stock.quantityMtr).toFixed(3)}
      </TableCell>
      <TableCell className="text-right">{stock.pieces}</TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.001"
          min="0.001"
          max={stock.quantityMtr}
          defaultValue={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
          className="w-28"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={() => onReserve(stock.id, parseFloat(qtyInput))}
          disabled={reserving || parseFloat(qtyInput) <= 0}
        >
          Reserve
        </Button>
      </TableCell>
    </TableRow>
  );
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
  const [generatingPR, setGeneratingPR] = useState(false);

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

    if (qtyToReserve <= 0 || isNaN(qtyToReserve)) {
      toast.error("Please enter a valid quantity");
      return;
    }

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reserve stock");
      }

      // Show FIFO warnings if any
      if (data.fifoWarnings && data.fifoWarnings.length > 0) {
        toast.warning(data.fifoWarnings[0]);
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

  const handleReleaseReservation = async (reservationId: string) => {
    if (!confirm("Release this stock reservation? The stock will become available again.")) return;

    try {
      const response = await fetch(`/api/sales-orders/${params.id}/reserve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to release reservation");
      }

      toast.success("Reservation released");
      fetchSalesOrder(params.id as string);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGeneratePR = async () => {
    if (!confirm("Generate a Purchase Requisition for shortfall items?")) return;

    setGeneratingPR(true);
    try {
      const response = await fetch(`/api/sales-orders/${params.id}/generate-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`PR ${data.prNo} generated with ${data.itemCount} item(s)`);
      } else {
        toast.info(data.message || "No PR generated");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate PR");
    } finally {
      setGeneratingPR(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!salesOrder) {
    return null;
  }

  if (salesOrder.poAcceptanceStatus !== "ACCEPTED") {
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
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Customer PO Review Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Stock reservation is blocked until the Customer PO has been reviewed and accepted
                    (ISO 9001:2018 Clause 8.2.3). Current status: <strong>{salesOrder.poAcceptanceStatus}</strong>
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push(`/sales/${salesOrder.id}/review`)}>
                Review PO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasShortfall = salesOrder.items.some((item) => {
    const reservedQty =
      item.stockReservations?.reduce(
        (sum, res) => sum + Number(res.reservedQtyMtr),
        0
      ) || 0;
    return Number(item.quantity) - reservedQty > 0.001;
  });

  const allFullyReserved = salesOrder.items.every((item) => {
    const reservedQty =
      item.stockReservations?.reduce(
        (sum, res) => sum + Number(res.reservedQtyMtr),
        0
      ) || 0;
    return Number(item.quantity) - reservedQty <= 0.001;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserve Inventory Stock"
        description={`Allocate inventory against SO: ${salesOrder.soNo}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {hasShortfall && (
            <Button
              variant="outline"
              onClick={handleGeneratePR}
              disabled={generatingPR}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {generatingPR ? "Generating..." : "Generate PR for Shortfall"}
            </Button>
          )}
        </div>
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

          {/* Existing reservations detail */}
          {salesOrder.items.some(
            (item) => item.stockReservations && item.stockReservations.length > 0
          ) && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Current Reservations</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item #</TableHead>
                    <TableHead>Heat No</TableHead>
                    <TableHead>MTC No</TableHead>
                    <TableHead className="text-right">Reserved Qty (Mtr)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOrder.items.flatMap((item) =>
                    (item.stockReservations || []).map((res) => (
                      <TableRow key={res.id}>
                        <TableCell>#{item.sNo}</TableCell>
                        <TableCell className="font-mono font-medium">
                          {res.inventoryStock.heatNo || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {res.inventoryStock.mtcNo || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(res.reservedQtyMtr).toFixed(3)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(res.reservedDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              res.status === "RESERVED"
                                ? "bg-blue-500"
                                : res.status === "DISPATCHED"
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }
                          >
                            {res.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {res.status === "RESERVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReleaseReservation(res.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Release
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {allFullyReserved && (
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
              {selectedItem && (
                <span className="ml-2">
                  | Remaining: {(
                    Number(selectedItem.quantity) -
                    (selectedItem.stockReservations?.reduce(
                      (sum, res) => sum + Number(res.reservedQtyMtr),
                      0
                    ) || 0)
                  ).toFixed(3)} Mtr
                </span>
              )}
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
                  Use "Generate PR for Shortfall" to create a Purchase Requisition.
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
                    <TableHead>Make</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead>Reserve Qty</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableStock.map((stock) => {
                    const remainingShortfall = selectedItem
                      ? Number(selectedItem.quantity) -
                        (selectedItem.stockReservations?.reduce(
                          (sum, res) => sum + Number(res.reservedQtyMtr),
                          0
                        ) || 0)
                      : 0;

                    return (
                      <StockRow
                        key={stock.id}
                        stock={stock}
                        defaultQty={Math.min(
                          Number(stock.quantityMtr),
                          remainingShortfall
                        )}
                        reserving={reserving}
                        onReserve={handleReserveStock}
                      />
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
