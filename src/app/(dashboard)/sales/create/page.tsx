"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Customer {
  id: string;
  name: string;
  city?: string;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  items: any[];
}

interface SOItem {
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
  unitWeight?: number;
  totalWeightMT?: number;
}

export default function CreateSalesOrderPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateSalesOrderPage />
    </Suspense>
  );
}

function CreateSalesOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedQuotationId = searchParams.get("quotationId");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    quotationId: "",
    customerPoNo: "",
    customerPoDate: "",
    customerPoDocument: "",
    projectName: "",
    deliverySchedule: "",
    paymentTerms: "",
  });

  const [items, setItems] = useState<SOItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/masters/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch("/api/quotations?status=APPROVED,SENT");
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations || []);
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    }
  };

  const handleQuotationChange = useCallback(
    (quotationId: string) => {
      const selectedQuotation = quotations.find((q) => q.id === quotationId);
      if (selectedQuotation) {
        setFormData((prev) => ({
          ...prev,
          quotationId,
          customerId: selectedQuotation.customerId,
        }));

        // Auto-populate items from quotation
        const quotationItems: SOItem[] = selectedQuotation.items.map((item) => ({
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.sizeLabel || "",
          od: parseFloat(item.od) || 0,
          wt: parseFloat(item.wt) || 0,
          ends: item.ends || "",
          quantity: parseFloat(item.quantity) || 0,
          unitRate: parseFloat(item.unitRate) || 0,
          amount: parseFloat(item.amount) || 0,
          deliveryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
          unitWeight: parseFloat(item.unitWeight) || undefined,
          totalWeightMT: parseFloat(item.totalWeightMT) || undefined,
        }));
        setItems(quotationItems);
      } else {
        setFormData((prev) => ({ ...prev, quotationId }));
      }
    },
    [quotations]
  );

  // Auto-select quotation from URL param once quotations are loaded
  useEffect(() => {
    if (preselectedQuotationId && quotations.length > 0 && !formData.quotationId) {
      handleQuotationChange(preselectedQuotationId);
    }
  }, [preselectedQuotationId, quotations, formData.quotationId, handleQuotationChange]);

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

    // Auto-calculate amount
    if (field === "quantity" || field === "unitRate") {
      const qty = field === "quantity" ? (parseFloat(value) || 0) : updatedItems[index].quantity;
      const rate = field === "unitRate" ? (parseFloat(value) || 0) : updatedItems[index].unitRate;
      updatedItems[index].amount = Math.max(0, qty * rate);
    }

    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.quantity || item.quantity <= 0) {
        toast.error(`Item ${i + 1}: Quantity must be greater than zero`);
        return;
      }
      if (!item.unitRate || item.unitRate <= 0) {
        toast.error(`Item ${i + 1}: Unit rate must be greater than zero`);
        return;
      }
      if (!item.product) {
        toast.error(`Item ${i + 1}: Product is required`);
        return;
      }
    }

    await submitOrder(false);
  };

  const submitOrder = async (forceCreate: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customerPoDate: formData.customerPoDate || null,
          items,
          forceCreate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle credit limit exceeded as a warning that can be overridden
        if (errorData.creditLimitExceeded) {
          const proceed = confirm(
            `${errorData.error}\n\nDo you want to proceed anyway?`
          );
          if (proceed) {
            await submitOrder(true);
            return;
          }
          return;
        }

        throw new Error(errorData.error || "Failed to create sales order");
      }

      const data = await response.json();
      toast.success(`Sales Order ${data.soNo} created successfully`);
      router.push(`/sales/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Sales Order"
        description="Create a new sales order from quotation or manually"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quotationId">Reference Quotation (Optional)</Label>
                <Select
                  value={formData.quotationId}
                  onValueChange={(value) => handleQuotationChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Quotation" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotations.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quotationNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerId: value })
                  }
                  disabled={!!formData.quotationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.city ? ` (${c.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

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
                  placeholder="Enter project name"
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
                  placeholder="e.g. 4-6 weeks from PO date"
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
                  placeholder="e.g. 30 days from invoice"
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
                No items added. Click "Add Item" or select a quotation to auto-populate.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
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
                      Amount: ₹ {item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="text-right text-lg font-semibold pt-4 border-t">
                  Total: ₹{" "}
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
            {loading ? "Creating..." : "Create Sales Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
