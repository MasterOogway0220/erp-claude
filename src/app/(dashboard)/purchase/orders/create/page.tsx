"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Vendor {
  id: string;
  code: string;
  name: string;
}

interface PR {
  id: string;
  prNo: string;
  items: Array<{
    product: string;
    material: string;
    additionalSpec: string;
    sizeLabel: string;
    quantity: number;
  }>;
}

interface SalesOrder {
  id: string;
  soNo: string;
}

interface POItem {
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  quantity: number;
  unitRate: number;
  amount: number;
  deliveryDate: string;
}

export default function CreatePOPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <CreatePOPage />
    </Suspense>
  );
}

function CreatePOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [prs, setPRs] = useState<PR[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  const [formData, setFormData] = useState({
    vendorId: "",
    prId: searchParams.get("prId") || "",
    salesOrderId: "",
    deliveryDate: format(
      new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    ),
    specialRequirements: "",
    currency: "INR",
  });

  const [items, setItems] = useState<POItem[]>([
    {
      product: "",
      material: "",
      additionalSpec: "",
      sizeLabel: "",
      quantity: 0,
      unitRate: 0,
      amount: 0,
      deliveryDate: format(
        new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      ),
    },
  ]);

  useEffect(() => {
    fetchVendors();
    fetchPRs();
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (formData.prId) {
      loadPRItems(formData.prId);
    }
  }, [formData.prId]);

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

  const fetchPRs = async () => {
    try {
      const response = await fetch("/api/purchase/requisitions?status=APPROVED");
      if (response.ok) {
        const data = await response.json();
        setPRs(data.purchaseRequisitions || []);
      }
    } catch (error) {
      console.error("Failed to fetch PRs:", error);
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

  const loadPRItems = async (prId: string) => {
    const pr = prs.find((p) => p.id === prId);
    if (pr) {
      const prItems: POItem[] = pr.items.map((item) => ({
        product: item.product,
        material: item.material,
        additionalSpec: item.additionalSpec,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        unitRate: 0,
        amount: 0,
        deliveryDate: formData.deliveryDate,
      }));
      setItems(prItems);
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
        unitRate: 0,
        amount: 0,
        deliveryDate: formData.deliveryDate,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate amount
    if (field === "quantity" || field === "unitRate") {
      const qty = field === "quantity" ? parseFloat(value) : updatedItems[index].quantity;
      const rate = field === "unitRate" ? parseFloat(value) : updatedItems[index].unitRate;
      updatedItems[index].amount = qty * rate;
    }

    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (items.some((item) => !item.product || !item.quantity || !item.unitRate)) {
      toast.error("Please fill in required fields for all items");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          prId: formData.prId || null,
          salesOrderId: formData.salesOrderId || null,
          items,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create PO");
      }

      const data = await response.json();
      toast.success(`Purchase Order ${data.poNo} created successfully`);
      router.push(`/purchase/orders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Purchase Order"
        description="Create a new purchase order from PR or manually"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PO Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor *</Label>
                <select
                  id="vendorId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.vendorId}
                  onChange={(e) =>
                    setFormData({ ...formData, vendorId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} - {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prId">PR Reference (Optional)</Label>
                <select
                  id="prId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.prId}
                  onChange={(e) =>
                    setFormData({ ...formData, prId: e.target.value })
                  }
                >
                  <option value="">Select PR (if applicable)</option>
                  {prs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.prNo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesOrderId">SO Reference (Optional)</Label>
                <select
                  id="salesOrderId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.salesOrderId}
                  onChange={(e) =>
                    setFormData({ ...formData, salesOrderId: e.target.value })
                  }
                >
                  <option value="">Select SO (if applicable)</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.soNo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                value={formData.specialRequirements}
                onChange={(e) =>
                  setFormData({ ...formData, specialRequirements: e.target.value })
                }
                rows={3}
                placeholder="Testing requirements, MTC type, TPI requirements, etc."
              />
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
                No items added. Click "Add Item" or select a PR to auto-populate.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 p-4 border rounded-lg"
                  >
                    <div className="col-span-2">
                      <Label className="text-xs">Product *</Label>
                      <Input
                        value={item.product}
                        onChange={(e) => updateItem(index, "product", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Material</Label>
                      <Input
                        value={item.material}
                        onChange={(e) => updateItem(index, "material", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Size</Label>
                      <Input
                        value={item.sizeLabel}
                        onChange={(e) => updateItem(index, "sizeLabel", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Rate *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Delivery Date</Label>
                      <Input
                        type="date"
                        value={item.deliveryDate}
                        onChange={(e) =>
                          updateItem(index, "deliveryDate", e.target.value)
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
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
                    <div className="col-span-12 text-right text-sm text-muted-foreground">
                      Amount: {formData.currency} {item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="text-right text-lg font-semibold pt-4 border-t">
                  Total: {formData.currency}{" "}
                  {items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                </div>
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
            {loading ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
