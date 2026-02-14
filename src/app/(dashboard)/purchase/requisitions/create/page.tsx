"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { PipeSizeSelect } from "@/components/shared/pipe-size-select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface Vendor {
  id: string;
  name: string;
  city?: string;
}

interface SalesOrder {
  id: string;
  soNo: string;
}

interface PRItem {
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  quantity: number;
  uom: string;
  remarks: string;
}

export default function CreatePRPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreatePRPage />
    </Suspense>
  );
}

function CreatePRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  const [formData, setFormData] = useState({
    salesOrderId: searchParams.get("salesOrderId") || "",
    suggestedVendorId: "",
    requisitionType: "AGAINST_SO",
    requiredByDate: format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    ),
  });

  const [items, setItems] = useState<PRItem[]>([
    {
      product: "",
      material: "",
      additionalSpec: "",
      sizeLabel: "",
      quantity: 0,
      uom: "MTR",
      remarks: "",
    },
  ]);

  useEffect(() => {
    fetchVendors();
    fetchSalesOrders();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/masters/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const response = await fetch("/api/sales-orders?status=OPEN");
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.salesOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product: "",
        material: "",
        additionalSpec: "",
        sizeLabel: "",
        quantity: 0,
        uom: "MTR",
        remarks: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PRItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (items.some((item) => !item.product || !item.quantity)) {
      toast.error("Please fill in required fields for all items");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/purchase/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salesOrderId: formData.salesOrderId || null,
          suggestedVendorId: formData.suggestedVendorId || null,
          items,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create PR");
      }

      const data = await response.json();
      toast.success(`Purchase Requisition ${data.prNo} created successfully`);
      router.push(`/purchase/requisitions/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Purchase Requisition"
        description="Create a new purchase requisition manually or from sales order shortfall"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PR Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requisitionType">Requisition Type</Label>
                <Select
                  value={formData.requisitionType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, requisitionType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGAINST_SO">Against SO</SelectItem>
                    <SelectItem value="STOCK_REPLENISHMENT">Stock Replenishment</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesOrderId">Sales Order Reference (Optional)</Label>
                <Select
                  value={formData.salesOrderId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, salesOrderId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SO (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        {so.soNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suggestedVendorId">Suggested Vendor (Optional)</Label>
                <Select
                  value={formData.suggestedVendorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, suggestedVendorId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredByDate">Required By Date</Label>
                <Input
                  id="requiredByDate"
                  type="date"
                  value={formData.requiredByDate}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredByDate: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No items added. Click "Add Item" to begin.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border rounded-lg"
                  >
                    <div className="md:col-span-6">
                      <ProductMaterialSelect
                        product={item.product}
                        material={item.material}
                        additionalSpec={item.additionalSpec}
                        onProductChange={(val) => updateItem(index, "product", val)}
                        onMaterialChange={(val) => updateItem(index, "material", val)}
                        onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                        showAdditionalSpec
                        productLabel="Product *"
                        materialLabel="Material"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Size</Label>
                      <PipeSizeSelect
                        value={item.sizeLabel}
                        onChange={(text) => updateItem(index, "sizeLabel", text)}
                        onSelect={(size) => {
                          updateItem(index, "sizeLabel", size.sizeLabel);
                        }}
                        label="Size"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">Quantity *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">UOM</Label>
                      <Select
                        value={item.uom}
                        onValueChange={(value) => updateItem(index, "uom", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MTR">MTR</SelectItem>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="PCS">PCS</SelectItem>
                          <SelectItem value="SET">SET</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-9"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="md:col-span-12">
                      <Label className="text-xs">Remarks</Label>
                      <Textarea
                        value={item.remarks}
                        onChange={(e) => updateItem(index, "remarks", e.target.value)}
                        className="h-16"
                        placeholder="Any special requirements or notes..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Purchase Requisition"}
          </Button>
        </div>
      </form>
    </div>
  );
}
