"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface ItemRow {
  /** Unique key for this row (poItem id or intimation item id) */
  sourceId: string;
  /** The poItemId to send, if applicable */
  poItemId: string | null;
  description: string;
  sizeLabel: string;
  uom: string;
  make: string;
  selected: boolean;
}

function CreateInspectionPrepForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId");
  const intimationId = searchParams.get("intimationId");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    if (poId) {
      fetchPO(poId);
    } else if (intimationId) {
      fetchIntimation(intimationId);
    }
  }, [poId, intimationId]);

  const fetchPO = async (id: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/purchase/orders/${id}`);
      if (!res.ok) throw new Error("Failed to load PO");
      const data = await res.json();
      const po = data.purchaseOrder;
      setSourceLabel(`PO: ${po.poNo}`);
      setItems(
        (po.items || []).map((item: any) => ({
          sourceId: item.id,
          poItemId: item.id,
          description: [item.product, item.material, item.additionalSpec]
            .filter(Boolean)
            .join(" – "),
          sizeLabel: item.sizeLabel || "",
          uom: item.uom || "",
          make: "",
          selected: true,
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load purchase order");
    } finally {
      setFetching(false);
    }
  };

  const fetchIntimation = async (id: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/warehouse/intimation/${id}`);
      if (!res.ok) throw new Error("Failed to load intimation");
      const data = await res.json();
      setSourceLabel(`MPR: ${data.mprNo}`);
      setItems(
        (data.items || []).map((item: any) => ({
          sourceId: item.id,
          poItemId: item.salesOrderItemId || null,
          description: [item.product, item.material, item.additionalSpec]
            .filter(Boolean)
            .join(" – "),
          sizeLabel: item.sizeLabel || "",
          uom: item.uom || "Mtr",
          make: "",
          selected: true,
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load warehouse intimation");
    } finally {
      setFetching(false);
    }
  };

  const toggleItem = (sourceId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.sourceId === sourceId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const updateItemField = (
    sourceId: string,
    field: "make" | "sizeLabel" | "uom",
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.sourceId === sourceId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const itemsToInclude = selected.map((item) => ({
      poItemId: item.poItemId,
      description: item.description,
      sizeLabel: item.sizeLabel,
      uom: item.uom,
      make: item.make,
    }));

    setLoading(true);
    try {
      const res = await fetch("/api/quality/inspection-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: poId || null,
          warehouseIntimationId: intimationId || null,
          itemsToInclude,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create inspection prep");
      }

      const prep = await res.json();
      toast.success(`Inspection Prep ${prep.prepNo} created`);
      router.push(`/quality/inspection-prep/${prep.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!poId && !intimationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Inspection Prep"
          description="Prepare items for material inspection"
        >
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No source selected. Use the &ldquo;Prepare for Inspection&rdquo;
            button from a PO or Warehouse Intimation.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Inspection Prep"
        description={
          sourceLabel
            ? `Creating prep from ${sourceLabel}`
            : "Prepare items for material inspection"
        }
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {fetching ? (
        <PageLoading />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Items to Include</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No items found for this source document.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.sourceId}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(item.sourceId)}
                        className="mt-1"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-muted-foreground">
                            Description
                          </Label>
                          <p className="text-sm font-medium">
                            {item.description || "(no description)"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Size
                          </Label>
                          <Input
                            value={item.sizeLabel}
                            onChange={(e) =>
                              updateItemField(
                                item.sourceId,
                                "sizeLabel",
                                e.target.value
                              )
                            }
                            placeholder="Size"
                            className="h-8 text-sm"
                            disabled={!item.selected}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            UOM
                          </Label>
                          <Input
                            value={item.uom}
                            onChange={(e) =>
                              updateItemField(
                                item.sourceId,
                                "uom",
                                e.target.value
                              )
                            }
                            placeholder="UOM"
                            className="h-8 text-sm"
                            disabled={!item.selected}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-xs text-muted-foreground">
                            Default Make (Manufacturer)
                          </Label>
                          <Input
                            value={item.make}
                            onChange={(e) =>
                              updateItemField(
                                item.sourceId,
                                "make",
                                e.target.value
                              )
                            }
                            placeholder="Manufacturer / make"
                            className="h-8 text-sm"
                            disabled={!item.selected}
                          />
                        </div>
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
            <Button type="submit" disabled={loading || items.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Create Inspection Prep"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CreateInspectionPrepPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateInspectionPrepForm />
    </Suspense>
  );
}
