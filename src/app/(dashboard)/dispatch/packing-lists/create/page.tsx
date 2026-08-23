"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useWarehouses } from "@/hooks/use-masters";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Save, Check } from "lucide-react";
import { toast } from "sonner";

interface SalesOrder {
  id: string;
  soNo: string;
  soDate: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  items: any[];
}

interface StockItem {
  id: string;
  heatNo: string;
  sizeLabel: string;
  product: string;
  material: string;
  specification: string;
  quantityMtr: number;
  pieces: number;
  status: string;
  reservedForSO: string | null;
}

interface SelectedItem {
  inventoryStockId: string;
  heatNo: string;
  sizeLabel: string;
  material: string;
  product: string;
  quantityMtr: string;
  pieces: string;
  bundleNo: string;
  grossWeightKg: string;
  netWeightKg: string;
  markingDetails: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
}

export default function CreatePackingListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSOId, setSelectedSOId] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  // Same list, same key, as the sales screen — one cache entry serves both.
  const { data: soData } = useApiQuery<{ salesOrders: SalesOrder[] }>(
    // All three screens sharing this key must request the same shape, or
    // whichever loads first fills the cache and the others read the wrong one.
    ["sales-orders", "list"],
    "/api/sales-orders?view=list"
  );
  // Only orders still open for dispatch can be packed against.
  const salesOrders = (soData?.salesOrders ?? []).filter(
    (so) => so.status === "OPEN" || so.status === "PARTIALLY_DISPATCHED"
  );

  const warehouses = useWarehouses<WarehouseOption>().filter((w) => w.isActive);

  // Deferred exactly as the effect was: nothing is read until an order is picked.
  const { data: soDetail } = useApiQuery<{ salesOrder: SalesOrder }>(
    ["sales-order", selectedSOId],
    `/api/sales-orders/${selectedSOId}`,
    { enabled: !!selectedSOId }
  );
  const selectedSO = soDetail?.salesOrder ?? null;

  const { data: acceptedData } = useApiQuery<{ stocks: StockItem[] }>(
    ["inventory-stock", "status=ACCEPTED"],
    "/api/inventory/stock?status=ACCEPTED",
    { enabled: !!selectedSOId }
  );
  const { data: reservedData } = useApiQuery<{ stocks: StockItem[] }>(
    ["inventory-stock", "status=RESERVED"],
    "/api/inventory/stock?status=RESERVED",
    { enabled: !!selectedSOId }
  );
  // Accepted stock is packable by anyone; reserved stock only by the order it
  // was set aside for. That filter is client-side, so it stays out of the key.
  const availableStock = [
    ...(acceptedData?.stocks ?? []),
    ...(reservedData?.stocks ?? []).filter(
      (s) => s.reservedForSO === selectedSOId
    ),
  ];

  const toggleStockSelection = (stock: StockItem) => {
    const existing = selectedItems.find(
      (item) => item.inventoryStockId === stock.id
    );

    if (existing) {
      setSelectedItems(
        selectedItems.filter((item) => item.inventoryStockId !== stock.id)
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          inventoryStockId: stock.id,
          heatNo: stock.heatNo || "",
          sizeLabel: stock.sizeLabel || "",
          material: stock.specification || stock.material || "",
          product: stock.product || "",
          quantityMtr: String(Number(stock.quantityMtr)),
          pieces: String(stock.pieces || 0),
          bundleNo: "",
          grossWeightKg: "",
          netWeightKg: "",
          markingDetails: "",
        },
      ]);
    }
  };

  const updateSelectedItem = (
    index: number,
    field: keyof SelectedItem,
    value: string
  ) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSOId) {
      toast.error("Please select an Order");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please select at least one stock item");
      return;
    }

    const validItems = selectedItems.filter(
      (item) => item.inventoryStockId && parseFloat(item.quantityMtr) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please ensure items have valid quantities");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dispatch/packing-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: selectedSOId,
          warehouseId: warehouseId || null,
          remarks,
          items: validItems.map((item) => ({
            inventoryStockId: item.inventoryStockId,
            heatNo: item.heatNo,
            sizeLabel: item.sizeLabel,
            material: item.material,
            quantityMtr: item.quantityMtr,
            pieces: item.pieces,
            bundleNo: item.bundleNo || null,
            grossWeightKg: item.grossWeightKg || null,
            netWeightKg: item.netWeightKg || null,
            markingDetails: item.markingDetails || null,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create packing list");
      }

      const data = await response.json();
      toast.success(`Packing List ${data.plNo} created successfully`);
      router.push(`/dispatch/packing-lists/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Packing List"
        description="Select stock items to pack against an Order"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Packing List Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order *</Label>
                <Select
                  value={selectedSOId || "NONE"}
                  onValueChange={(v) => {
                    const id = v === "NONE" ? "" : v;
                    setSelectedSOId(id);
                    // Clearing the order drops the picks made against it.
                    if (!id) setSelectedItems([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>Select Order</SelectItem>
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        {so.soNo} - {so.customer?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSO && (
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    value={selectedSO.customer?.name || ""}
                    disabled
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId || "NONE"} onValueChange={(v) => setWarehouseId(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Optional remarks..."
              />
            </div>
          </CardContent>
        </Card>

        {selectedSOId && (
          <Card>
            <CardHeader>
              <CardTitle>Available Stock (Accepted / Reserved)</CardTitle>
            </CardHeader>
            <CardContent>
              {availableStock.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No available stock found for this Order.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Heat No.</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty (Mtr)</TableHead>
                      <TableHead className="text-right">Pcs</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableStock.map((stock) => {
                      const isSelected = selectedItems.some(
                        (item) => item.inventoryStockId === stock.id
                      );
                      return (
                        <TableRow
                          key={stock.id}
                          className={
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "cursor-pointer hover:bg-muted/50"
                          }
                          onClick={() => toggleStockSelection(stock)}
                        >
                          <TableCell>
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {stock.heatNo || "---"}
                          </TableCell>
                          <TableCell>{stock.product || "---"}</TableCell>
                          <TableCell>{stock.specification || stock.material || "---"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {stock.sizeLabel || "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(stock.quantityMtr).toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right">
                            {stock.pieces}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                stock.status === "ACCEPTED"
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                              }
                            >
                              {stock.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Selected Items ({selectedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div
                    key={item.inventoryStockId}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Item #{index + 1} - Heat: {item.heatNo || "N/A"} |{" "}
                        {item.sizeLabel} | {item.material}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Qty (Mtr) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantityMtr}
                          onChange={(e) =>
                            updateSelectedItem(
                              index,
                              "quantityMtr",
                              e.target.value
                            )
                          }
                          placeholder="0.000"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pieces</Label>
                        <Input
                          type="number"
                          value={item.pieces}
                          onChange={(e) =>
                            updateSelectedItem(index, "pieces", e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Bundle No.</Label>
                        <Input
                          value={item.bundleNo}
                          onChange={(e) =>
                            updateSelectedItem(
                              index,
                              "bundleNo",
                              e.target.value
                            )
                          }
                          placeholder="Bundle number"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Gross Wt. (Kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.grossWeightKg}
                          onChange={(e) =>
                            updateSelectedItem(
                              index,
                              "grossWeightKg",
                              e.target.value
                            )
                          }
                          placeholder="0.000"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Net Wt. (Kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.netWeightKg}
                          onChange={(e) =>
                            updateSelectedItem(
                              index,
                              "netWeightKg",
                              e.target.value
                            )
                          }
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Marking Details</Label>
                      <Input
                        value={item.markingDetails}
                        onChange={(e) =>
                          updateSelectedItem(
                            index,
                            "markingDetails",
                            e.target.value
                          )
                        }
                        placeholder="Marking / stenciling details"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || selectedItems.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Packing List"}
          </Button>
        </div>
      </form>
    </div>
  );
}
