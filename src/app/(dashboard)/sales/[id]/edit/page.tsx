"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { PipeSizeSelect } from "@/components/shared/pipe-size-select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface SOItem {
  id?: string;
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  od: number;
  wt: number;
  ends: string;
  quantity: number;
  unitRate: number;
  amount: number;
  deliveryDate: string;
}

export default function EditSalesOrderPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soNo, setSoNo] = useState("");

  const [formData, setFormData] = useState({
    customerPoNo: "",
    customerPoDate: "",
    customerPoDocument: "",
    projectName: "",
    deliverySchedule: "",
    paymentTerms: "",
  });

  const [items, setItems] = useState<SOItem[]>([]);

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
      const so = data.salesOrder;

      if (so.status !== "OPEN") {
        toast.error("Only OPEN sales orders can be edited");
        router.push(`/sales/${id}`);
        return;
      }

      setSoNo(so.soNo);
      setFormData({
        customerPoNo: so.customerPoNo || "",
        customerPoDate: so.customerPoDate
          ? format(new Date(so.customerPoDate), "yyyy-MM-dd")
          : "",
        customerPoDocument: so.customerPoDocument || "",
        projectName: so.projectName || "",
        deliverySchedule: so.deliverySchedule || "",
        paymentTerms: so.paymentTerms || "",
      });

      setItems(
        so.items.map((item: any) => ({
          id: item.id,
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.sizeLabel || "",
          od: Number(item.od) || 0,
          wt: Number(item.wt) || 0,
          ends: item.ends || "",
          quantity: Number(item.quantity) || 0,
          unitRate: Number(item.unitRate) || 0,
          amount: Number(item.amount) || 0,
          deliveryDate: item.deliveryDate
            ? format(new Date(item.deliveryDate), "yyyy-MM-dd")
            : "",
        }))
      );
    } catch (error) {
      toast.error("Failed to load sales order");
      router.push("/sales");
    } finally {
      setLoading(false);
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
        od: 0,
        wt: 0,
        ends: "",
        quantity: 0,
        unitRate: 0,
        amount: 0,
        deliveryDate: format(new Date(), "yyyy-MM-dd"),
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SOItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === "quantity" || field === "unitRate") {
      const qty = field === "quantity" ? (parseFloat(value) || 0) : updatedItems[index].quantity;
      const rate = field === "unitRate" ? (parseFloat(value) || 0) : updatedItems[index].unitRate;
      updatedItems[index].amount = Math.max(0, qty * rate);
    }

    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("At least one item is required");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].quantity || items[i].quantity <= 0) {
        toast.error(`Item ${i + 1}: Quantity must be greater than zero`);
        return;
      }
      if (!items[i].unitRate || items[i].unitRate <= 0) {
        toast.error(`Item ${i + 1}: Unit rate must be greater than zero`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/sales-orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customerPoDate: formData.customerPoDate || null,
          items,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(`Sales Order ${soNo} updated`);
      router.push(`/sales/${params.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Sales Order: ${soNo}`}
        description="Modify sales order details and line items"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerPoNo">Customer PO Number</Label>
                <Input
                  id="customerPoNo"
                  value={formData.customerPoNo}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPoNo: e.target.value })
                  }
                  placeholder="Enter PO number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPoDate">Customer PO Date</Label>
                <Input
                  id="customerPoDate"
                  type="date"
                  value={formData.customerPoDate}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPoDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPoDocument">PO Document URL</Label>
                <Input
                  id="customerPoDocument"
                  value={formData.customerPoDocument}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPoDocument: e.target.value })
                  }
                  placeholder="Document URL or path"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData({ ...formData, projectName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
                <Input
                  id="deliverySchedule"
                  value={formData.deliverySchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, deliverySchedule: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: e.target.value })
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
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border rounded-lg"
                >
                  <div className="md:col-span-4">
                    <ProductMaterialSelect
                      product={item.product}
                      material={item.material}
                      additionalSpec={item.additionalSpec}
                      onProductChange={(val) => updateItem(index, "product", val)}
                      onMaterialChange={(val) => updateItem(index, "material", val)}
                      onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                      showAdditionalSpec
                      onAutoFill={(fields) => {
                        if (fields.ends) updateItem(index, "ends", fields.ends);
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Size</Label>
                    <PipeSizeSelect
                      value={item.sizeLabel}
                      onChange={(text) => updateItem(index, "sizeLabel", text)}
                      onSelect={(size) => {
                        updateItem(index, "sizeLabel", size.sizeLabel);
                        updateItem(index, "od", size.od);
                        updateItem(index, "wt", size.wt);
                      }}
                      label="Size"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Qty (Mtr)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Unit Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.unitRate}
                      onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Delivery Date</Label>
                    <Input
                      type="date"
                      value={item.deliveryDate}
                      onChange={(e) => updateItem(index, "deliveryDate", e.target.value)}
                      className="h-9"
                    />
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
                  <div className="md:col-span-12 text-right text-sm text-muted-foreground">
                    Amount: {item.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="text-right text-lg font-semibold pt-4 border-t">
                Total: {items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
