"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Package,
  Warehouse,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

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

export default function AllotmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [soNo, setSoNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [allotmentStatus, setAllotmentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editStockQty, setEditStockQty] = useState("");
  const [editProcQty, setEditProcQty] = useState("");

  const fetchAnalysis = async () => {
    try {
      const [analysisRes, soRes] = await Promise.all([
        fetch(`/api/sales-orders/${id}/allotment/analyze`),
        fetch(`/api/sales-orders/${id}`),
      ]);

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setItems(data.items || []);
      } else {
        toast.error("Failed to load allotment analysis");
      }

      if (soRes.ok) {
        const soData = await soRes.json();
        setSoNo(soData.soNo || "");
        setCustomerName(soData.customer?.name || "");
        setAllotmentStatus(soData.allotmentStatus || "PENDING");
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const cancelEdit = () => {
    setEditingItemId(null);
  };

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
      // SPLIT
      setEditStockQty(String(Math.min(avail, qty)));
      setEditProcQty(String(Math.max(0, qty - avail)));
    }
  };

  const confirmItem = async (itemId: string) => {
    const stockQty = parseFloat(editStockQty) || 0;
    const procQty = parseFloat(editProcQty) || 0;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/allotment`, {
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
      const res = await fetch(`/api/sales-orders/${id}/allotment`, {
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

  if (loading) return <PageLoading />;

  // Summary counts
  const totalItems = items.length;
  const allocatedStock = items.filter(
    (i) => i.currentAllotment?.status === "ALLOCATED" && i.currentAllotment.source === "STOCK"
  ).length;
  const allocatedProcurement = items.filter(
    (i) =>
      i.currentAllotment?.status === "ALLOCATED" &&
      i.currentAllotment.source === "PROCUREMENT"
  ).length;
  const allocatedSplit = items.filter(
    (i) =>
      i.currentAllotment?.status === "ALLOCATED" &&
      i.currentAllotment.source === "SPLIT"
  ).length;
  const pendingCount = items.filter(
    (i) => !i.currentAllotment || i.currentAllotment.status !== "ALLOCATED"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Stock Allotment — ${soNo}`}
        description={`Customer: ${customerName}`}
      >
        <Button
          variant="outline"
          onClick={() => router.push(`/sales/${id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

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
            <div className="text-2xl font-bold text-gray-500">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Allocate Button */}
      {pendingCount > 0 && (
        <div className="flex justify-end">
          <Button onClick={autoAllocateAll} disabled={submitting}>
            <Zap className="w-4 h-4 mr-2" />
            {submitting ? "Allocating..." : `Auto-Allocate All Pending (${pendingCount})`}
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
                const isPending = !item.currentAllotment || item.currentAllotment.status !== "ALLOCATED";

                return (
                  <TableRow key={item.salesOrderItemId}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product || "—"}</div>
                        {item.material && (
                          <div className="text-xs text-muted-foreground">
                            {item.material}
                          </div>
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
                            <SelectItem
                              value="STOCK"
                              disabled={item.availableStockQty <= 0}
                            >
                              Stock
                            </SelectItem>
                            <SelectItem value="PROCUREMENT">
                              Procurement
                            </SelectItem>
                            <SelectItem
                              value="SPLIT"
                              disabled={item.availableStockQty <= 0}
                            >
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
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          Change
                        </Button>
                      ) : isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            onClick={() => confirmItem(item.salesOrderItemId)}
                            disabled={submitting}
                          >
                            {submitting ? "..." : "Confirm"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          Allocate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No items found for this Sales Order.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
