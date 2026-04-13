"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { SizeSelect } from "@/components/shared/size-select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { FittingSelect } from "@/components/shared/fitting-select";
import { FlangeSelect } from "@/components/shared/flange-select";

type POItemCategory = "Pipe" | "Fitting" | "Flange";

interface Vendor {
  id: string;
  name: string;
  city?: string;
}

interface POItem {
  itemCategory: POItemCategory;
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  quantity: number;
  unitRate: number;
  amount: number;
  deliveryDate: string;
  fittingId: string;
  fittingLabel: string;
  flangeId: string;
  flangeLabel: string;
}

export default function EditPOPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditPOPage />
    </Suspense>
  );
}

function EditPOPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const defaultDeliveryDate = format(
    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const [formData, setFormData] = useState({
    vendorId: "",
    deliveryDate: defaultDeliveryDate,
    specialRequirements: "",
    currency: "INR",
  });

  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    fetchVendors();
    fetchPO();
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

  const fetchPO = async () => {
    try {
      const response = await fetch(`/api/purchase/orders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch purchase order");
      const data = await response.json();
      const po = data.purchaseOrder;

      if (po.status !== "DRAFT") {
        toast.error("Only DRAFT purchase orders can be edited");
        router.push(`/purchase/orders/${id}`);
        return;
      }

      setFormData({
        vendorId: po.vendor?.id || "",
        deliveryDate: po.deliveryDate
          ? format(new Date(po.deliveryDate), "yyyy-MM-dd")
          : defaultDeliveryDate,
        specialRequirements: po.specialRequirements || "",
        currency: po.currency || "INR",
      });

      setItems(
        (po.items || []).map((item: any) => ({
          itemCategory: "Pipe" as POItemCategory,
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.sizeLabel || "",
          quantity: parseFloat(String(item.quantity)) || 0,
          unitRate: parseFloat(String(item.unitRate)) || 0,
          amount: parseFloat(String(item.amount)) || 0,
          deliveryDate: item.deliveryDate
            ? format(new Date(item.deliveryDate), "yyyy-MM-dd")
            : defaultDeliveryDate,
          fittingId: item.fittingId || "",
          fittingLabel: "",
          flangeId: item.flangeId || "",
          flangeLabel: "",
        }))
      );
    } catch (error) {
      toast.error("Failed to load purchase order");
      router.push(`/purchase/orders/${id}`);
    } finally {
      setFetching(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemCategory: "Pipe",
        product: "",
        material: "",
        additionalSpec: "",
        sizeLabel: "",
        quantity: 0,
        unitRate: 0,
        amount: 0,
        deliveryDate: formData.deliveryDate,
        fittingId: "",
        fittingLabel: "",
        flangeId: "",
        flangeLabel: "",
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
      const qty = field === "quantity" ? (parseFloat(value) || 0) : (updatedItems[index].quantity || 0);
      const rate = field === "unitRate" ? (parseFloat(value) || 0) : (updatedItems[index].unitRate || 0);
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
      const response = await fetch(`/api/purchase/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "full_edit",
          vendorId: formData.vendorId,
          deliveryDate: formData.deliveryDate,
          specialRequirements: formData.specialRequirements,
          currency: formData.currency,
          items,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update PO");
      }

      toast.success("Purchase Order updated successfully");
      router.push(`/purchase/orders/${id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Purchase Order"
        description="Edit this DRAFT purchase order"
      >
        <Button variant="outline" onClick={() => router.push(`/purchase/orders/${id}`)}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor *</Label>
                <Select
                  value={formData.vendorId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendorId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>Select Vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

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
                No items added. Click &quot;Add Item&quot; to add line items.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border rounded-lg"
                  >
                    <div className="md:col-span-12 flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">Item #{index + 1}</span>
                      <div className="flex rounded-md border overflow-hidden text-xs">
                        {(["Pipe", "Fitting", "Flange"] as POItemCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`px-2.5 py-0.5 transition-colors ${
                              item.itemCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-accent"
                            }`}
                            onClick={() => {
                              const newItems = [...items];
                              newItems[index] = {
                                itemCategory: cat,
                                product: "",
                                material: "",
                                additionalSpec: "",
                                sizeLabel: "",
                                quantity: item.quantity,
                                unitRate: item.unitRate,
                                amount: item.amount,
                                deliveryDate: item.deliveryDate,
                                fittingId: "",
                                fittingLabel: "",
                                flangeId: "",
                                flangeLabel: "",
                              };
                              setItems(newItems);
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    {item.itemCategory === "Fitting" && (
                      <div className="md:col-span-6">
                        <Label className="text-xs">Select Fitting *</Label>
                        <FittingSelect
                          value={item.fittingLabel}
                          onChange={(text) => {
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], fittingLabel: text, fittingId: "" };
                            setItems(newItems);
                          }}
                          onSelect={(f) => {
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              fittingId: f.id,
                              fittingLabel: `${f.type} ${f.size} ${f.schedule || ""} ${f.endType || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim(),
                              product: f.type,
                              material: f.materialGrade,
                              sizeLabel: f.size,
                              additionalSpec: [f.endType, f.rating, f.standard].filter(Boolean).join(", "),
                            };
                            setItems(newItems);
                          }}
                        />
                      </div>
                    )}
                    {item.itemCategory === "Flange" && (
                      <div className="md:col-span-6">
                        <Label className="text-xs">Select Flange *</Label>
                        <FlangeSelect
                          value={item.flangeLabel}
                          onChange={(text) => {
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], flangeLabel: text, flangeId: "" };
                            setItems(newItems);
                          }}
                          onSelect={(f) => {
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              flangeId: f.id,
                              flangeLabel: `${f.type} ${f.size} ${f.rating}# ${f.facing || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim(),
                              product: f.type,
                              material: f.materialGrade,
                              sizeLabel: f.size,
                              additionalSpec: [f.facing, f.rating + "#", f.standard].filter(Boolean).join(", "),
                            };
                            setItems(newItems);
                          }}
                        />
                      </div>
                    )}
                    <div className="md:col-span-4">
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
                      <SizeSelect
                        value={item.sizeLabel}
                        onChange={(text) => updateItem(index, "sizeLabel", text)}
                        onSelect={(size) => {
                          updateItem(index, "sizeLabel", size.sizeLabel);
                        }}
                        label="Size"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Rate *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitRate || ""}
                        onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
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
                      Amount: {formData.currency} {(item.amount || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="text-right text-lg font-semibold pt-4 border-t">
                  Total: {formData.currency}{" "}
                  {items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/purchase/orders/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
