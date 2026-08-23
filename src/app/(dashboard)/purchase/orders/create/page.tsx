"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useVendors } from "@/hooks/use-masters";
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
import { ProductMaterialSelect, getMasterExtraSizes } from "@/components/shared/product-material-select";
import { SizeSelect } from "@/components/shared/size-select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { SmartCombobox } from "@/components/shared/smart-combobox";
import { flangeDimForSize, getFittingSizeOptions, getFlangeSizeOptions, inferItemCategory } from "@/lib/fitting-flange-sizes";

type POItemCategory = "Pipe" | "Fitting" | "Flange";

interface Vendor {
  id: string;
  name: string;
  city?: string;
}

interface SalesOrder {
  id: string;
  soNo: string;
  items?: any[];
  customer?: { name: string };
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

export default function CreatePOPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreatePOPage />
    </Suspense>
  );
}

function CreatePOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const vendors = useVendors<Vendor>();
  const [prs, setPRs] = useState<any[]>([]);
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

  const defaultDeliveryDate = format(
    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const [items, setItems] = useState<POItem[]>([
    {
      itemCategory: "Pipe",
      product: "",
      material: "",
      additionalSpec: "",
      sizeLabel: "",
      quantity: 0,
      unitRate: 0,
      amount: 0,
      deliveryDate: defaultDeliveryDate,
      fittingId: "",
      fittingLabel: "",
      flangeId: "",
      flangeLabel: "",
    },
  ]);

  useEffect(() => {
    fetchPRs();
    fetchSalesOrders();
  }, []);

  // Load PR items when prId changes AND prs are loaded
  useEffect(() => {
    if (formData.prId && prs.length > 0) {
      loadPRItems(formData.prId);
    }
  }, [formData.prId, prs]);

  // Load SO items when salesOrderId changes
  useEffect(() => {
    if (formData.salesOrderId) {
      loadSOItems(formData.salesOrderId);
    }
  }, [formData.salesOrderId]);

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

  const mapToPOItems = (sourceItems: any[]): POItem[] => {
    return sourceItems.map((item: any) => ({
      itemCategory: (item.fittingId
        ? "Fitting"
        : item.flangeId
          ? "Flange"
          : inferItemCategory(item.product || "")) as POItemCategory,
      product: item.product || "",
      material: item.material || "",
      additionalSpec: item.additionalSpec || "",
      sizeLabel: item.sizeLabel || "",
      quantity: parseFloat(String(item.quantity)) || 0,
      unitRate: parseFloat(String(item.unitRate)) || 0,
      amount: (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unitRate)) || 0),
      deliveryDate: item.deliveryDate
        ? format(new Date(item.deliveryDate), "yyyy-MM-dd")
        : formData.deliveryDate,
      fittingId: "",
      fittingLabel: "",
      flangeId: "",
      flangeLabel: "",
    }));
  };

  const loadPRItems = (prId: string) => {
    const pr = prs.find((p: any) => p.id === prId);
    if (pr?.items?.length > 0) {
      setItems(mapToPOItems(pr.items));

      // Carry the order-processing requirements onto the vendor PO. They are
      // the reason the material has to be a particular one; a PO placed
      // without them buys something the client will reject at inspection.
      // Pre-filled, not locked — the buyer can still edit before sending.
      const requirements: string[] = Array.from(
        new Set(
          pr.items
            .map((i: any) =>
              i.technicalRequirements
                ? `${i.product || "Item"} ${i.sizeLabel || ""}`.trim() +
                  `:\n${i.technicalRequirements}`
                : null
            )
            .filter(Boolean) as string[]
        )
      );
      if (requirements.length > 0) {
        setFormData((prev) => ({
          ...prev,
          specialRequirements: prev.specialRequirements
            ? prev.specialRequirements
            : requirements.join("\n\n"),
        }));
      }

      toast.success(`Loaded ${pr.items.length} items from PR ${pr.prNo}`);
    }
  };

  const loadSOItems = async (soId: string) => {
    try {
      const response = await fetch(`/api/sales-orders/${soId}`);
      if (response.ok) {
        const data = await response.json();
        const so = data.salesOrder || data;
        if (so.items?.length > 0) {
          setItems(mapToPOItems(so.items));
          toast.success(`Loaded ${so.items.length} items from SO ${so.soNo || ""}`);
        }
      }
    } catch (error) {
      console.error("Failed to fetch SO details:", error);
      toast.error("Failed to load SO items");
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

  // Functional update — synchronous multi-field writes from a single combobox
  // selection batch under React 19; a stale [...items] clone would keep only
  // the last write.
  const updateItem = (index: number, field: keyof POItem, value: any) => {
    setItems((prev) => {
      const updatedItems = [...prev];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      if (field === "quantity" || field === "unitRate") {
        const qty = field === "quantity" ? (parseFloat(value) || 0) : (updatedItems[index].quantity || 0);
        const rate = field === "unitRate" ? (parseFloat(value) || 0) : (updatedItems[index].unitRate || 0);
        updatedItems[index].amount = qty * rate;
      }
      return updatedItems;
    });
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
        description="Create a new purchase order from PR, SO, or manually"
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
                <Label htmlFor="prId">PR Reference (Optional)</Label>
                <Select
                  value={formData.prId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, prId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PR (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {prs.map((pr: any) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.prNo}{pr.salesOrder ? ` (SO: ${pr.salesOrder.soNo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesOrderId">SO Reference (Optional)</Label>
                <Select
                  value={formData.salesOrderId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, salesOrderId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SO (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        {so.soNo}{(so as any).customer?.name ? ` — ${(so as any).customer.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                No items added. Click &quot;Add Item&quot; or select a PR/SO to auto-populate.
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
                    <div className="md:col-span-4">
                      <ProductMaterialSelect
                        category={
                          item.itemCategory === "Fitting" ? "FITTINGS"
                          : item.itemCategory === "Flange" ? "FLANGES"
                          : "PIPES"
                        }
                        product={item.product}
                        material={item.material}
                        additionalSpec={item.additionalSpec}
                        onProductChange={(val) => updateItem(index, "product", val)}
                        onMaterialChange={(val) => updateItem(index, "material", val)}
                        onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                        showAdditionalSpec
                        productLabel="Product *"
                        materialLabel="Material"
                        onAutoFill={({ ends, dimStandard, size }) => {
                          // A size recorded on the master row lands on the item
                          // when it is blank (never over the user's own entry).
                          if (size) {
                            setItems((prev) => {
                              const cur = prev[index];
                              if (!cur || cur.sizeLabel || cur.itemCategory === "Pipe") return prev;
                              const next = [...prev];
                              next[index] = { ...cur, sizeLabel: size };
                              return next;
                            });
                          }
                          // Old FittingSelect composed end/standard into the
                          // spec column; keep that for fitting items. Guard
                          // INSIDE the functional update — the render-scoped
                          // item is stale mid-batch (material onSelect clears
                          // additionalSpec in the same event).
                          const spec = [ends, dimStandard].filter(Boolean).join(", ");
                          if (!spec) return;
                          setItems((prev) => {
                            const cur = prev[index];
                            if (!cur || cur.itemCategory !== "Fitting" || cur.additionalSpec) return prev;
                            const next = [...prev];
                            next[index] = { ...cur, additionalSpec: spec };
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Size</Label>
                      {item.itemCategory === "Fitting" ? (
                        <SmartCombobox
                          options={Array.from(new Set([...getFittingSizeOptions(item.product), ...getMasterExtraSizes(item.product)]))}
                          value={item.sizeLabel}
                          onSelect={(s: string) => updateItem(index, "sizeLabel", s)}
                          onChange={(text) => updateItem(index, "sizeLabel", text)}
                          displayFn={(s: string) => s}
                          filterFn={(s: string, q) => s.toLowerCase().includes(q.toLowerCase())}
                          placeholder={item.product ? "Search sizes..." : "Select product first"}
                        />
                      ) : item.itemCategory === "Flange" ? (
                        <SmartCombobox
                          options={Array.from(new Set([...getFlangeSizeOptions(item.product), ...getMasterExtraSizes(item.product)]))}
                          value={item.sizeLabel}
                          onSelect={(label: string) => {
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              sizeLabel: label,
                              // B16.47 sizes leave this blank on purpose — the
                              // size can't say Sr. A from Sr. B, so guessing
                              // B16.5 would print the wrong standard.
                              additionalSpec: newItems[index].additionalSpec || flangeDimForSize(label) || "",
                            };
                            setItems(newItems);
                          }}
                          onChange={(text) => updateItem(index, "sizeLabel", text)}
                          displayFn={(s: string) => s}
                          filterFn={(s: string, q) => s.toLowerCase().includes(q.toLowerCase())}
                          placeholder={item.product ? "Search sizes..." : "Select product first"}
                        />
                      ) : (
                        <SizeSelect
                          value={item.sizeLabel}
                          onChange={(text) => updateItem(index, "sizeLabel", text)}
                          onSelect={(size) => {
                            updateItem(index, "sizeLabel", size.sizeLabel);
                          }}
                          label="Size"
                        />
                      )}
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
