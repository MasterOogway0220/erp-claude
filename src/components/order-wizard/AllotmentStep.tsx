"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Warehouse,
  ShoppingCart,
  Zap,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { WizardOrder } from "./OrderWizard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisItem {
  salesOrderItemId: string;
  sNo: number;
  product: string | null;
  material: string | null;
  sizeLabel: string | null;
  orderedQty: number;
  existingReservations: number;
  remainingQty: number;
  availableStockQty: number;
  suggestedSource: string;
  suggestedStockQty: number;
  suggestedProcurementQty: number;
  currentAllotment: {
    source: string;
    stockQty: number;
    procurementQty: number;
    status: string;
  } | null;
}

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

interface AllotmentStepProps {
  order: WizardOrder;
  onComplete: (done: boolean) => void;
}

// ---------------------------------------------------------------------------
// StockRow — extracted to avoid useState inside .map()
// ---------------------------------------------------------------------------

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
  const [qtyInput, setQtyInput] = useState(Math.max(0, defaultQty).toFixed(3));

  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{stock.heatNo || "—"}</TableCell>
      <TableCell className="font-mono text-sm">{stock.mtcNo || "—"}</TableCell>
      <TableCell>
        {stock.mtcDate ? format(new Date(stock.mtcDate), "dd MMM yyyy") : "—"}
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

// ---------------------------------------------------------------------------
// AllotmentStep
// ---------------------------------------------------------------------------

export function AllotmentStep({ order, onComplete }: AllotmentStepProps) {
  const orderId = order.id;

  // ── Allotment analysis state ─────────────────────────────────────────────
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [allotmentStatus, setAllotmentStatus] = useState(order.allotmentStatus || "PENDING");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editStockQty, setEditStockQty] = useState("");
  const [editProcQty, setEditProcQty] = useState("");

  // ── Reserve-stock panel state ────────────────────────────────────────────
  const [reservePanelOpen, setReservePanelOpen] = useState(false);
  const [soItems, setSoItems] = useState<SOItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SOItem | null>(null);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [generatingPR, setGeneratingPR] = useState(false);

  // ── Derived completion signal ────────────────────────────────────────────
  const signalComplete = useCallback(
    (status: string, analysisItems?: AnalysisItem[]) => {
      const effectiveItems = analysisItems ?? items;
      const allAllocated =
        effectiveItems.length > 0 &&
        effectiveItems.every((i) => i.currentAllotment?.status === "ALLOCATED");
      const done =
        status === "COMPLETED" ||
        status === "IN_PROGRESS" ||
        allAllocated;
      onComplete(done);
    },
    [items, onComplete]
  );

  // Pre-gate on mount if already allotted
  useEffect(() => {
    if (
      order.allotmentStatus === "COMPLETED" ||
      order.allotmentStatus === "IN_PROGRESS"
    ) {
      onComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Allotment analysis fetch ─────────────────────────────────────────────
  const fetchAnalysis = useCallback(async () => {
    try {
      const [analysisRes, soRes] = await Promise.all([
        fetch(`/api/sales-orders/${orderId}/allotment/analyze`),
        fetch(`/api/sales-orders/${orderId}`),
      ]);

      let fetchedItems: AnalysisItem[] = [];
      if (analysisRes.ok) {
        const data = await analysisRes.json();
        fetchedItems = data.items || [];
        setItems(fetchedItems);
      } else {
        toast.error("Failed to load allotment analysis");
      }

      if (soRes.ok) {
        const soData = await soRes.json();
        const status = soData.allotmentStatus || "PENDING";
        setAllotmentStatus(status);
        signalComplete(status, fetchedItems);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [orderId, signalComplete]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // ── Edit helpers ─────────────────────────────────────────────────────────
  const startEdit = (item: AnalysisItem) => {
    setEditingItemId(item.salesOrderItemId);
    if (item.currentAllotment) {
      setEditSource(item.currentAllotment.source);
      setEditStockQty(String(item.currentAllotment.stockQty));
      setEditProcQty(String(item.currentAllotment.procurementQty));
    } else {
      setEditSource(item.suggestedSource);
      setEditStockQty(String(item.suggestedStockQty));
      setEditProcQty(String(item.suggestedProcurementQty));
    }
  };

  const cancelEdit = () => setEditingItemId(null);

  const handleSourceChange = (source: string, item: AnalysisItem) => {
    setEditSource(source);
    const qty = item.orderedQty;
    const avail = item.availableStockQty;
    if (source === "STOCK") {
      setEditStockQty(String(qty));
      setEditProcQty("0");
    } else if (source === "PROCUREMENT") {
      setEditStockQty("0");
      setEditProcQty(String(qty));
    } else {
      setEditStockQty(String(Math.min(avail, qty)));
      setEditProcQty(String(Math.max(0, qty - avail)));
    }
  };

  const confirmItem = async (itemId: string) => {
    const stockQty = parseFloat(editStockQty) || 0;
    const procQty = parseFloat(editProcQty) || 0;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-orders/${orderId}/allotment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              salesOrderItemId: itemId,
              source: editSource,
              stockAllocQty: stockQty,
              procurementAllocQty: procQty,
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Allotment confirmed${data.mprNo ? ` — MPR ${data.mprNo} created` : ""}${data.prNo ? ` — PR ${data.prNo} created` : ""}`
        );
        setEditingItemId(null);
        await fetchAnalysis();
      } else {
        toast.error(data.error || "Failed to confirm allotment");
      }
    } catch {
      toast.error("Failed to confirm allotment");
    } finally {
      setSubmitting(false);
    }
  };

  const autoAllocateAll = async () => {
    const pendingItems = items.filter(
      (item) => !item.currentAllotment || item.currentAllotment.status !== "ALLOCATED"
    );
    if (pendingItems.length === 0) {
      toast.info("No pending items to allocate");
      return;
    }

    const allotmentItems = pendingItems.map((item) => ({
      salesOrderItemId: item.salesOrderItemId,
      source: item.suggestedSource,
      stockAllocQty: item.suggestedStockQty,
      procurementAllocQty: item.suggestedProcurementQty,
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-orders/${orderId}/allotment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: allotmentItems }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `${pendingItems.length} item(s) allocated${data.mprNo ? ` — MPR ${data.mprNo}` : ""}${data.prNo ? ` — PR ${data.prNo}` : ""}`
        );
        setEditingItemId(null);
        await fetchAnalysis();
      } else {
        toast.error(data.error || "Failed to auto-allocate");
      }
    } catch {
      toast.error("Failed to auto-allocate");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reserve-stock panel logic ────────────────────────────────────────────
  const fetchSalesOrderForReserve = useCallback(async () => {
    setLoadingReserve(true);
    try {
      const response = await fetch(`/api/sales-orders/${orderId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      // The reserve page used data.salesOrder; the allotment page used top-level soData.
      // Try both shapes:
      const so = data.salesOrder ?? data;
      setSoItems(so.items || []);
    } catch {
      toast.error("Failed to load reservation data");
    } finally {
      setLoadingReserve(false);
    }
  }, [orderId]);

  const openReservePanel = () => {
    setReservePanelOpen(true);
    fetchSalesOrderForReserve();
  };

  const fetchAvailableStock = async (itemId: string) => {
    setLoadingStock(true);
    try {
      const response = await fetch(
        `/api/sales-orders/${orderId}/reserve?soItemId=${itemId}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAvailableStock(data.availableStock || []);
    } catch {
      toast.error("Failed to load available stock");
    } finally {
      setLoadingStock(false);
    }
  };

  const handleOpenReservationDialog = (item: SOItem) => {
    setSelectedItem(item);
    fetchAvailableStock(item.id);
    setReserveDialogOpen(true);
  };

  const handleReserveStock = async (stockId: string, qtyToReserve: number) => {
    if (!selectedItem) return;
    if (qtyToReserve <= 0 || isNaN(qtyToReserve)) {
      toast.error("Please enter a valid quantity");
      return;
    }
    setReserving(true);
    try {
      const response = await fetch(`/api/sales-orders/${orderId}/reserve`, {
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
      if (!response.ok) throw new Error(data.error || "Failed to reserve stock");
      if (data.fifoWarnings && data.fifoWarnings.length > 0) {
        toast.warning(data.fifoWarnings[0]);
      }
      toast.success("Stock reserved successfully");
      setReserveDialogOpen(false);
      fetchSalesOrderForReserve();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve stock");
    } finally {
      setReserving(false);
    }
  };

  const handleReleaseReservation = async (reservationId: string) => {
    if (!confirm("Release this stock reservation? The stock will become available again.")) return;
    try {
      const response = await fetch(`/api/sales-orders/${orderId}/reserve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to release reservation");
      }
      toast.success("Reservation released");
      fetchSalesOrderForReserve();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to release reservation");
    }
  };

  const handleGeneratePR = async () => {
    if (!confirm("Generate a Purchase Requisition for shortfall items?")) return;
    setGeneratingPR(true);
    try {
      const response = await fetch(`/api/sales-orders/${orderId}/generate-pr`, {
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PR");
    } finally {
      setGeneratingPR(false);
    }
  };

  // ── Derived summary ──────────────────────────────────────────────────────
  const totalItems = items.length;
  const allocatedStock = items.filter(
    (i) => i.currentAllotment?.status === "ALLOCATED" && i.currentAllotment.source === "STOCK"
  ).length;
  const allocatedProcurement = items.filter(
    (i) => i.currentAllotment?.status === "ALLOCATED" && i.currentAllotment.source === "PROCUREMENT"
  ).length;
  const allocatedSplit = items.filter(
    (i) => i.currentAllotment?.status === "ALLOCATED" && i.currentAllotment.source === "SPLIT"
  ).length;
  const pendingCount = items.filter(
    (i) => !i.currentAllotment || i.currentAllotment.status !== "ALLOCATED"
  ).length;

  const hasShortfall = soItems.some((item) => {
    const reservedQty =
      item.stockReservations?.reduce((sum, res) => sum + Number(res.reservedQtyMtr), 0) || 0;
    return Number(item.quantity) - reservedQty > 0.001;
  });

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <span className="text-sm">Loading allotment data…</span>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Allotment</h2>
          <p className="text-sm text-muted-foreground">
            Assign stock or procurement source for each line item.
            {allotmentStatus !== "PENDING" && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                {allotmentStatus}
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openReservePanel}>
          <Package className="w-4 h-4 mr-2" />
          Manual Stock Reservation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-green-500" />
              Allocated to Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allocatedStock + allocatedSplit}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              Allocated to Procurement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {allocatedProcurement + allocatedSplit}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Allocate Button */}
      {pendingCount > 0 && (
        <div className="flex justify-end">
          <Button onClick={autoAllocateAll} disabled={submitting}>
            <Zap className="w-4 h-4 mr-2" />
            {submitting ? "Allocating…" : `Auto-Allocate All Pending (${pendingCount})`}
          </Button>
        </div>
      )}

      {/* Items Table */}
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
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Ordered Qty</TableHead>
                <TableHead className="text-right">Available Stock</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Stock Qty</TableHead>
                <TableHead className="text-right">Procurement Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isEditing = editingItemId === item.salesOrderItemId;
                const isAllocated =
                  item.currentAllotment?.status === "ALLOCATED" && !isEditing;
                const isPending =
                  !item.currentAllotment || item.currentAllotment.status !== "ALLOCATED";

                return (
                  <TableRow key={item.salesOrderItemId}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product || "—"}</div>
                        {item.material && (
                          <div className="text-xs text-muted-foreground">{item.material}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.sizeLabel || "—"}</TableCell>
                    <TableCell className="text-right">{item.orderedQty}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.availableStockQty > 0
                            ? "text-green-600 font-medium"
                            : "text-red-500"
                        }
                      >
                        {item.availableStockQty}
                      </span>
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      {isAllocated ? (
                        <Badge
                          variant={
                            item.currentAllotment!.source === "STOCK"
                              ? "default"
                              : item.currentAllotment!.source === "PROCUREMENT"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {item.currentAllotment!.source}
                        </Badge>
                      ) : isEditing || isPending ? (
                        <Select
                          value={isEditing ? editSource : item.suggestedSource}
                          onValueChange={(val) => {
                            if (!isEditing) startEdit(item);
                            handleSourceChange(val, item);
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STOCK" disabled={item.availableStockQty <= 0}>
                              Stock
                            </SelectItem>
                            <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                            <SelectItem value="SPLIT" disabled={item.availableStockQty <= 0}>
                              Split
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                    </TableCell>

                    {/* Stock Qty */}
                    <TableCell className="text-right">
                      {isAllocated ? (
                        item.currentAllotment!.stockQty || "—"
                      ) : isEditing ? (
                        <Input
                          type="number"
                          value={editStockQty}
                          onChange={(e) => setEditStockQty(e.target.value)}
                          disabled={editSource === "PROCUREMENT"}
                          className="w-24 text-right ml-auto"
                          min={0}
                          step={0.001}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {item.suggestedStockQty || "—"}
                        </span>
                      )}
                    </TableCell>

                    {/* Procurement Qty */}
                    <TableCell className="text-right">
                      {isAllocated ? (
                        item.currentAllotment!.procurementQty || "—"
                      ) : isEditing ? (
                        <Input
                          type="number"
                          value={editProcQty}
                          onChange={(e) => setEditProcQty(e.target.value)}
                          disabled={editSource === "STOCK"}
                          className="w-24 text-right ml-auto"
                          min={0}
                          step={0.001}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {item.suggestedProcurementQty || "—"}
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {isAllocated ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Allocated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Pending
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      {isAllocated ? (
                        <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                          Change
                        </Button>
                      ) : isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            onClick={() => confirmItem(item.salesOrderItemId)}
                            disabled={submitting}
                          >
                            {submitting ? "…" : "Confirm"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                          Allocate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items found for this Order.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Manual Stock Reservation Panel ── */}
      <Dialog open={reservePanelOpen} onOpenChange={setReservePanelOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual Stock Reservation</DialogTitle>
            <DialogDescription>
              Reserve inventory stock against individual line items. Use this for fine-grained
              control beyond the auto-allotment above.
            </DialogDescription>
          </DialogHeader>

          {loadingReserve ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading reservation data…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generate PR for shortfall */}
              {hasShortfall && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleGeneratePR}
                    disabled={generatingPR}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {generatingPR ? "Generating…" : "Generate PR for Shortfall"}
                  </Button>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Items &amp; Reservation Status</CardTitle>
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
                      {soItems.map((item) => {
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
                                  isFullyReserved
                                    ? "text-green-600"
                                    : "text-yellow-600 font-medium"
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
                  {soItems.some(
                    (item) => item.stockReservations && item.stockReservations.length > 0
                  ) && (
                    <div className="mt-6 space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Current Reservations
                      </h4>
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
                          {soItems.flatMap((item) =>
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

                  {soItems.length > 0 &&
                    soItems.every((item) => {
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Stock picker dialog (inside reservation panel) ── */}
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reserve Inventory for Item #{selectedItem?.sNo}</DialogTitle>
            <DialogDescription>
              Product: {selectedItem?.product} | Material: {selectedItem?.material} | Size:{" "}
              {selectedItem?.sizeLabel}
              {selectedItem && (
                <span className="ml-2">
                  | Remaining:{" "}
                  {(
                    Number(selectedItem.quantity) -
                    (selectedItem.stockReservations?.reduce(
                      (sum, res) => sum + Number(res.reservedQtyMtr),
                      0
                    ) || 0)
                  ).toFixed(3)}{" "}
                  Mtr
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingStock ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading available stock…
            </div>
          ) : availableStock.length === 0 ? (
            <div className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No matching stock available</p>
                <p className="text-sm mt-2">
                  Use &quot;Generate PR for Shortfall&quot; to create a Purchase Requisition.
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
                        defaultQty={Math.min(Number(stock.quantityMtr), remainingShortfall)}
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
