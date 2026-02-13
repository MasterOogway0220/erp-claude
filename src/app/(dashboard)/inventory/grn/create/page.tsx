"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface WarehouseLocation {
  id: string;
  zone: string | null;
  rack: string | null;
  bay: string | null;
  shelf: string | null;
  locationType: string;
  isActive: boolean;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  locations: WarehouseLocation[];
}

interface GRNItem {
  product: string;
  material: string;
  specification: string;
  additionalSpec: string;
  dimensionStd: string;
  sizeLabel: string;
  ends: string;
  length: string;
  heatNo: string;
  make: string;
  receivedQtyMtr: string;
  pieces: string;
  mtcNo: string;
  mtcDate: string;
  mtcType: string;
  tpiAgency: string;
  warehouseLocationId: string;
}

const emptyItem: GRNItem = {
  product: "",
  material: "",
  specification: "",
  additionalSpec: "",
  dimensionStd: "",
  sizeLabel: "",
  ends: "",
  length: "",
  heatNo: "",
  make: "",
  receivedQtyMtr: "",
  pieces: "",
  mtcNo: "",
  mtcDate: "",
  mtcType: "",
  tpiAgency: "",
  warehouseLocationId: "",
};

export default function CreateGRNPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <CreateGRNPage />
    </Suspense>
  );
}

function CreateGRNPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [formData, setFormData] = useState({
    poId: searchParams.get("poId") || "",
    remarks: "",
  });
  const [items, setItems] = useState<GRNItem[]>([{ ...emptyItem }]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (formData.poId) {
      loadPOItems(formData.poId);
    }
  }, [formData.poId]);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch("/api/purchase/orders");
      if (response.ok) {
        const data = await response.json();
        const eligible = (data.purchaseOrders || []).filter(
          (po: any) => po.status === "OPEN" || po.status === "PARTIALLY_RECEIVED" || po.status === "DRAFT"
        );
        setPurchaseOrders(eligible);
      }
    } catch (error) {
      console.error("Failed to fetch POs:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/masters/warehouses");
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  // Build a flat list of warehouse location options for the dropdown
  const warehouseLocationOptions = warehouses.flatMap((wh) =>
    wh.locations
      .filter((loc) => loc.isActive)
      .map((loc) => {
        const parts = [loc.zone, loc.rack, loc.bay, loc.shelf].filter(Boolean);
        const locationLabel = parts.length > 0 ? parts.join("/") : "Default";
        return {
          id: loc.id,
          label: `${wh.name} - ${locationLabel}`,
        };
      })
  );

  const loadPOItems = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase/orders/${poId}`);
      if (response.ok) {
        const data = await response.json();
        const po = data.purchaseOrder;
        setSelectedPO(po);
        const grnItems = po.items.map((item: any) => ({
          product: item.product || "",
          material: item.material || "",
          specification: "",
          additionalSpec: item.additionalSpec || "",
          dimensionStd: "",
          sizeLabel: item.sizeLabel || "",
          ends: "",
          length: "",
          heatNo: "",
          make: "",
          receivedQtyMtr: String(Number(item.quantity)),
          pieces: "",
          mtcNo: "",
          mtcDate: "",
          mtcType: "",
          tpiAgency: "",
        }));
        setItems(grnItems.length > 0 ? grnItems : [{ ...emptyItem }]);
      }
    } catch (error) {
      console.error("Failed to load PO:", error);
    }
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof GRNItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poId) {
      toast.error("Please select a Purchase Order");
      return;
    }
    const validItems = items.filter(
      (item) => item.heatNo && parseFloat(item.receivedQtyMtr) > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one item with heat number and quantity");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/inventory/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: formData.poId,
          vendorId: selectedPO?.vendorId || selectedPO?.vendor?.id,
          remarks: formData.remarks,
          items: validItems,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create GRN");
      }
      const data = await response.json();
      toast.success(`GRN ${data.grnNo} created successfully`);
      router.push(`/inventory/grn/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create Goods Receipt Note" description="Record materials received against a Purchase Order">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>GRN Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Order *</Label>
                <Select value={formData.poId} onValueChange={(value) => setFormData({ ...formData, poId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>{po.poNo} - {po.vendor?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPO && (
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input value={selectedPO.vendor?.name || ""} disabled />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} rows={2} placeholder="Optional remarks..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Input value={item.product} onChange={(e) => updateItem(index, "product", e.target.value)} placeholder="e.g., PIPE" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Material</Label>
                      <Input value={item.material} onChange={(e) => updateItem(index, "material", e.target.value)} placeholder="e.g., A106 Gr.B" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Size</Label>
                      <Input value={item.sizeLabel} onChange={(e) => updateItem(index, "sizeLabel", e.target.value)} placeholder='e.g., 2" SCH 40' />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heat No. *</Label>
                      <Input value={item.heatNo} onChange={(e) => updateItem(index, "heatNo", e.target.value)} placeholder="Heat number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty (Mtr) *</Label>
                      <Input type="number" step="0.001" value={item.receivedQtyMtr} onChange={(e) => updateItem(index, "receivedQtyMtr", e.target.value)} placeholder="0.000" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pieces</Label>
                      <Input type="number" value={item.pieces} onChange={(e) => updateItem(index, "pieces", e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MTC No.</Label>
                      <Input value={item.mtcNo} onChange={(e) => updateItem(index, "mtcNo", e.target.value)} placeholder="MTC number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Make</Label>
                      <Input value={item.make} onChange={(e) => updateItem(index, "make", e.target.value)} placeholder="Manufacturer" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MTC Date</Label>
                      <Input type="date" value={item.mtcDate} onChange={(e) => updateItem(index, "mtcDate", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MTC Type</Label>
                      <Select value={item.mtcType} onValueChange={(value) => updateItem(index, "mtcType", value)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MTC_3_1">MTC 3.1</SelectItem>
                          <SelectItem value="MTC_3_2">MTC 3.2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">TPI Agency</Label>
                      <Input value={item.tpiAgency} onChange={(e) => updateItem(index, "tpiAgency", e.target.value)} placeholder="Agency name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ends</Label>
                      <Input value={item.ends} onChange={(e) => updateItem(index, "ends", e.target.value)} placeholder="e.g., BE, PE" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Warehouse Location</Label>
                      <Select value={item.warehouseLocationId || "NONE"} onValueChange={(value) => updateItem(index, "warehouseLocationId", value === "NONE" ? "" : value)}>
                        <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">No location</SelectItem>
                          {warehouseLocationOptions.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create GRN"}</Button>
        </div>
      </form>
    </div>
  );
}
