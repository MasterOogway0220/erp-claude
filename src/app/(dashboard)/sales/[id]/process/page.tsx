"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import {
  LAB_TESTS,
  NDT_TESTS,
  TPI_TYPES,
  PMI_TYPES,
  COATING_SIDES,
} from "@/lib/constants/order-processing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesOrderItem {
  id: string;
  sNo: number;
  product: string;
  material: string;
  sizeLabel: string;
  qtyOrdered: number;
  unitRate: number;
}

interface ProcessingRecord {
  id: string;
  poSlNo: string | null;
  poItemCode: string | null;
  colourCodingRequired: boolean;
  colourCode: string | null;
  additionalPipeSpec: string | null;
  hotDipGalvanising: boolean;
  screwedEnds: boolean;
  coatingRequired: boolean;
  coatingType: string | null;
  coatingSide: string | null;
  tpiRequired: boolean;
  tpiType: string | null;
  labTestingRequired: boolean;
  pmiRequired: boolean;
  pmiType: string | null;
  ndtRequired: boolean;
  ndtTests: string[] | null;
  vdiRequired: boolean;
  vdiWitnessPercent: number | null;
  hydroTestRequired: boolean;
  hydroWitnessPercent: number | null;
  requiredLabTests: string[] | null;
  status: string;
}

interface ProcessingItem {
  salesOrderItem: SalesOrderItem;
  processing: ProcessingRecord | null;
}

interface ProcessingData {
  poSlNo: string;
  poItemCode: string;
  colourCodingRequired: boolean;
  colourCode: string;
  additionalPipeSpec: string;
  hotDipGalvanising: boolean;
  screwedEnds: boolean;
  coatingRequired: boolean;
  coatingType: string;
  coatingSide: string;
  tpiRequired: boolean;
  tpiType: string;
  labTestingRequired: boolean;
  pmiRequired: boolean;
  pmiType: string;
  ndtRequired: boolean;
  ndtTests: string[];
  vdiRequired: boolean;
  vdiWitnessPercent: number | null;
  hydroTestRequired: boolean;
  hydroWitnessPercent: number | null;
  requiredLabTests: string[];
  status: string;
}

const defaultFormData: ProcessingData = {
  poSlNo: "",
  poItemCode: "",
  colourCodingRequired: false,
  colourCode: "",
  additionalPipeSpec: "",
  hotDipGalvanising: false,
  screwedEnds: false,
  coatingRequired: false,
  coatingType: "",
  coatingSide: "",
  tpiRequired: false,
  tpiType: "",
  labTestingRequired: false,
  pmiRequired: false,
  pmiType: "",
  ndtRequired: false,
  ndtTests: [],
  vdiRequired: false,
  vdiWitnessPercent: null,
  hydroTestRequired: false,
  hydroWitnessPercent: null,
  requiredLabTests: [],
  status: "PENDING",
};

// ---------------------------------------------------------------------------
// Helper — build form data from a processing record (or defaults)
// ---------------------------------------------------------------------------

function recordToFormData(rec: ProcessingRecord | null): ProcessingData {
  if (!rec) return { ...defaultFormData };
  return {
    poSlNo: rec.poSlNo ?? "",
    poItemCode: rec.poItemCode ?? "",
    colourCodingRequired: rec.colourCodingRequired,
    colourCode: rec.colourCode ?? "",
    additionalPipeSpec: rec.additionalPipeSpec ?? "",
    hotDipGalvanising: rec.hotDipGalvanising,
    screwedEnds: rec.screwedEnds,
    coatingRequired: rec.coatingRequired,
    coatingType: rec.coatingType ?? "",
    coatingSide: rec.coatingSide ?? "",
    tpiRequired: rec.tpiRequired,
    tpiType: rec.tpiType ?? "",
    labTestingRequired: rec.labTestingRequired,
    pmiRequired: rec.pmiRequired,
    pmiType: rec.pmiType ?? "",
    ndtRequired: rec.ndtRequired,
    ndtTests: Array.isArray(rec.ndtTests) ? rec.ndtTests : [],
    vdiRequired: rec.vdiRequired,
    vdiWitnessPercent: rec.vdiWitnessPercent,
    hydroTestRequired: rec.hydroTestRequired,
    hydroWitnessPercent: rec.hydroWitnessPercent,
    requiredLabTests: Array.isArray(rec.requiredLabTests)
      ? rec.requiredLabTests
      : [],
    status: rec.status,
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OrderProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ProcessingItem[]>([]);
  const [soInfo, setSoInfo] = useState<{
    soNo: string;
    processingStatus: string;
    customerName: string;
  }>({ soNo: "", processingStatus: "", customerName: "" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<ProcessingData>({
    ...defaultFormData,
  });
  const [allotmentAnalysis, setAllotmentAnalysis] = useState<any>(null);
  const [allotmentSource, setAllotmentSource] = useState<string>("");
  const [allotmentStockQty, setAllotmentStockQty] = useState<string>("");
  const [allotmentProcQty, setAllotmentProcQty] = useState<string>("");
  const [allottingItem, setAllottingItem] = useState(false);
  const [allotmentConfirmed, setAllotmentConfirmed] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-orders/${id}/processing`);
      if (!res.ok) throw new Error("Failed to fetch processing data");
      const data = await res.json();
      setSoInfo({
        soNo: data.salesOrder.soNo,
        processingStatus: data.salesOrder.processingStatus,
        customerName: data.salesOrder.customerName,
      });
      setItems(data.items);
      return data.items as ProcessingItem[];
    } catch {
      toast.error("Failed to load order processing data");
      return null;
    }
  }, [id]);

  // Alias so confirmAllotment (non-useCallback) can call it
  const fetchProcessingData = fetchData;

  useEffect(() => {
    fetchData().then((loadedItems) => {
      if (loadedItems && loadedItems.length > 0) {
        setFormData(recordToFormData(loadedItems[0].processing));
      }
      setLoading(false);
    });
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Allotment analysis
  // -----------------------------------------------------------------------

  const fetchAllotmentAnalysis = async (itemId: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${id}/allotment/analyze?itemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        const analysis = data.items?.[0];
        if (analysis) {
          setAllotmentAnalysis(analysis);
          setAllotmentSource(analysis.currentAllotment?.source || analysis.suggestedSource);
          if (analysis.currentAllotment) {
            setAllotmentStockQty(String(analysis.currentAllotment.stockQty || 0));
            setAllotmentProcQty(String(analysis.currentAllotment.procurementQty || 0));
            setAllotmentConfirmed(true);
          } else {
            setAllotmentStockQty(String(analysis.suggestedStockQty));
            setAllotmentProcQty(String(analysis.suggestedProcurementQty));
            setAllotmentConfirmed(false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to analyze allotment:", error);
    }
  };

  const confirmAllotment = async () => {
    if (!allotmentAnalysis) return;
    setAllottingItem(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/allotment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            salesOrderItemId: allotmentAnalysis.salesOrderItemId,
            source: allotmentSource,
            stockAllocQty: parseFloat(allotmentStockQty) || 0,
            procurementAllocQty: parseFloat(allotmentProcQty) || 0,
          }],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Allotment confirmed${data.mprNo ? ` — MPR ${data.mprNo} created` : ""}${data.prNo ? ` — PR ${data.prNo} created` : ""}`);
        setAllotmentConfirmed(true);
        fetchProcessingData();
      } else {
        toast.error(data.error || "Failed to confirm allotment");
      }
    } catch (error) {
      toast.error("Failed to confirm allotment");
    } finally {
      setAllottingItem(false);
    }
  };

  // -----------------------------------------------------------------------
  // Load item form at a given index
  // -----------------------------------------------------------------------

  const loadItemForm = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      const item = items[index];
      setFormData(recordToFormData(item?.processing ?? null));
      if (item?.processing?.status === "PROCESSED") {
        fetchAllotmentAnalysis(item.salesOrderItem.id);
      } else {
        setAllotmentAnalysis(null);
        setAllotmentConfirmed(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  // -----------------------------------------------------------------------
  // Save draft
  // -----------------------------------------------------------------------

  const saveDraft = useCallback(async () => {
    if (!items[currentIndex]) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/processing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderItemId: items[currentIndex].salesOrderItem.id,
          ...formData,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      const saved = await res.json();
      // Update local items state
      setItems((prev) => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          processing: saved,
        };
        return updated;
      });
      toast.success("Draft saved");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save draft";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [id, currentIndex, items, formData]);

  // -----------------------------------------------------------------------
  // Mark as processed
  // -----------------------------------------------------------------------

  const markProcessed = useCallback(async () => {
    if (!items[currentIndex]) return;
    setSaving(true);
    try {
      // Save first
      const saveRes = await fetch(`/api/sales-orders/${id}/processing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderItemId: items[currentIndex].salesOrderItem.id,
          ...formData,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }

      // Then mark processed
      const patchRes = await fetch(
        `/api/sales-orders/${id}/processing/${items[currentIndex].salesOrderItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "PROCESS" }),
        }
      );
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to mark as processed");
      }

      // Reload data
      const reloaded = await fetchData();
      if (reloaded) {
        setFormData(recordToFormData(reloaded[currentIndex]?.processing ?? null));
      }
      toast.success("Item marked as processed");
      fetchAllotmentAnalysis(items[currentIndex].salesOrderItem.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to mark as processed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [id, currentIndex, items, formData, fetchData]);

  // -----------------------------------------------------------------------
  // Reopen
  // -----------------------------------------------------------------------

  const reopenItem = useCallback(async () => {
    if (!items[currentIndex]) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/sales-orders/${id}/processing/${items[currentIndex].salesOrderItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REOPEN" }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reopen");
      }
      const reloaded = await fetchData();
      if (reloaded) {
        setFormData(recordToFormData(reloaded[currentIndex]?.processing ?? null));
      }
      toast.success("Item reopened for editing");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reopen item";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [id, currentIndex, items, fetchData]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goNext = useCallback(async () => {
    if (currentIndex >= items.length - 1) return;
    await saveDraft();
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setFormData(recordToFormData(items[next]?.processing ?? null));
    if (items[next]?.processing?.status === "PROCESSED") {
      fetchAllotmentAnalysis(items[next].salesOrderItem.id);
    } else {
      setAllotmentAnalysis(null);
      setAllotmentConfirmed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, saveDraft]);

  const goPrev = useCallback(async () => {
    if (currentIndex <= 0) return;
    await saveDraft();
    const prev = currentIndex - 1;
    setCurrentIndex(prev);
    setFormData(recordToFormData(items[prev]?.processing ?? null));
    if (items[prev]?.processing?.status === "PROCESSED") {
      fetchAllotmentAnalysis(items[prev].salesOrderItem.id);
    } else {
      setAllotmentAnalysis(null);
      setAllotmentConfirmed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, saveDraft]);

  const jumpToItem = useCallback(
    async (index: number) => {
      if (index === currentIndex) return;
      await saveDraft();
      setCurrentIndex(index);
      setFormData(recordToFormData(items[index]?.processing ?? null));
      if (items[index]?.processing?.status === "PROCESSED") {
        fetchAllotmentAnalysis(items[index].salesOrderItem.id);
      } else {
        setAllotmentAnalysis(null);
        setAllotmentConfirmed(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, items, saveDraft]
  );

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  if (loading) return <PageLoading />;
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Process Order" description="No items found." />
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const isProcessed = formData.status === "PROCESSED";
  const processedCount = items.filter(
    (i) => i.processing?.status === "PROCESSED"
  ).length;
  const totalCount = items.length;
  const soItem = currentItem.salesOrderItem;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title={`Process Order — ${soInfo.soNo}`}
        description={soInfo.customerName}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/sales/${id}`)}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to SO
        </Button>
      </PageHeader>

      {/* Progress info */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Item {currentIndex + 1} of {totalCount}
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span>
          {processedCount} of {totalCount} processed
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((item, idx) => {
          const itemProcessed = item.processing?.status === "PROCESSED";
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={item.salesOrderItem.id}
              onClick={() => jumpToItem(idx)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                itemProcessed
                  ? "bg-green-600 text-white"
                  : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={`Item ${idx + 1}${itemProcessed ? " (Processed)" : ""}`}
            >
              {itemProcessed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                idx + 1
              )}
            </button>
          );
        })}
      </div>

      {/* Current item info bar */}
      <Card className="bg-muted/50">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">#{soItem.sNo}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              {soItem.product} {soItem.material}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>{soItem.sizeLabel}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Qty: {soItem.qtyOrdered}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Rate: {soItem.unitRate}</span>
            {isProcessed && (
              <Badge variant="default" className="ml-auto bg-green-600">
                <CheckCircle className="mr-1 h-3 w-3" />
                Processed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section: PO References */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              PO References
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="poSlNo">S.No as per PO</Label>
                <Input
                  id="poSlNo"
                  value={formData.poSlNo}
                  onChange={(e) =>
                    setFormData({ ...formData, poSlNo: e.target.value })
                  }
                  disabled={isProcessed}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poItemCode">Item Code as per PO</Label>
                <Input
                  id="poItemCode"
                  value={formData.poItemCode}
                  onChange={(e) =>
                    setFormData({ ...formData, poItemCode: e.target.value })
                  }
                  disabled={isProcessed}
                  placeholder="e.g. SS304-2NB-S40"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Colour Coding */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Colour Coding
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="colourCodingRequired"
                  checked={formData.colourCodingRequired}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      colourCodingRequired: !!checked,
                    })
                  }
                  disabled={isProcessed}
                />
                <Label htmlFor="colourCodingRequired">
                  Colour coding required
                </Label>
              </div>
              {formData.colourCodingRequired && (
                <div className="ml-6 space-y-1.5">
                  <Label htmlFor="colourCode">Colour code</Label>
                  <Input
                    id="colourCode"
                    value={formData.colourCode}
                    onChange={(e) =>
                      setFormData({ ...formData, colourCode: e.target.value })
                    }
                    disabled={isProcessed}
                    placeholder="e.g. Blue band"
                    className="max-w-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Section: Additional Spec */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Additional Spec
            </h4>
            <div className="space-y-1.5">
              <Label htmlFor="additionalPipeSpec">
                Additional spec to be printed/stencilled on pipe
              </Label>
              <Input
                id="additionalPipeSpec"
                value={formData.additionalPipeSpec}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    additionalPipeSpec: e.target.value,
                  })
                }
                disabled={isProcessed}
                placeholder="e.g. NACE MR0175"
              />
            </div>
          </div>

          <Separator />

          {/* Section: Outsourced Processes */}
          <div>
            <Card className="bg-muted/30 border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide">
                  Outsourced Processes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Hot Dip Galvanising */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hotDipGalvanising"
                      checked={formData.hotDipGalvanising}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          hotDipGalvanising: !!checked,
                        })
                      }
                      disabled={isProcessed}
                    />
                    <Label htmlFor="hotDipGalvanising">
                      Hot Dip Galvanising
                    </Label>
                  </div>

                  {/* Screwed Ends */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="screwedEnds"
                      checked={formData.screwedEnds}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, screwedEnds: !!checked })
                      }
                      disabled={isProcessed}
                    />
                    <Label htmlFor="screwedEnds">Screwed Ends</Label>
                  </div>

                  {/* Coating */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="coatingRequired"
                        checked={formData.coatingRequired}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            coatingRequired: !!checked,
                          })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="coatingRequired">Coating</Label>
                    </div>
                    {formData.coatingRequired && (
                      <div className="ml-6 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Coating Type</Label>
                          <Input
                            value={formData.coatingType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                coatingType: e.target.value,
                              })
                            }
                            disabled={isProcessed}
                            placeholder="e.g. Epoxy"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Side</Label>
                          <Select
                            value={formData.coatingSide}
                            onValueChange={(v) =>
                              setFormData({ ...formData, coatingSide: v })
                            }
                            disabled={isProcessed}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select side" />
                            </SelectTrigger>
                            <SelectContent>
                              {COATING_SIDES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Third Party Inspection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tpiRequired"
                        checked={formData.tpiRequired}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, tpiRequired: !!checked })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="tpiRequired">
                        Third Party Inspection
                      </Label>
                    </div>
                    {formData.tpiRequired && (
                      <div className="ml-6 space-y-1">
                        <Label className="text-xs">TPI Type</Label>
                        <Select
                          value={formData.tpiType}
                          onValueChange={(v) =>
                            setFormData({ ...formData, tpiType: v })
                          }
                          disabled={isProcessed}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {TPI_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Lab Testing */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="labTestingRequired"
                      checked={formData.labTestingRequired}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          labTestingRequired: !!checked,
                        })
                      }
                      disabled={isProcessed}
                    />
                    <Label htmlFor="labTestingRequired">Lab Testing</Label>
                  </div>

                  {/* PMI Inspection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pmiRequired"
                        checked={formData.pmiRequired}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, pmiRequired: !!checked })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="pmiRequired">PMI Inspection</Label>
                    </div>
                    {formData.pmiRequired && (
                      <div className="ml-6 space-y-1">
                        <Label className="text-xs">PMI Type</Label>
                        <Select
                          value={formData.pmiType}
                          onValueChange={(v) =>
                            setFormData({ ...formData, pmiType: v })
                          }
                          disabled={isProcessed}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PMI_TYPES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* NDT Inspection */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="ndtRequired"
                        checked={formData.ndtRequired}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, ndtRequired: !!checked })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="ndtRequired">NDT Inspection</Label>
                    </div>
                    {formData.ndtRequired && (
                      <div className="ml-6 flex flex-wrap gap-4">
                        {NDT_TESTS.map((test) => (
                          <div
                            key={test.value}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              checked={formData.ndtTests.includes(test.value)}
                              onCheckedChange={(checked) => {
                                const updated = checked
                                  ? [...formData.ndtTests, test.value]
                                  : formData.ndtTests.filter(
                                      (t) => t !== test.value
                                    );
                                setFormData({ ...formData, ndtTests: updated });
                              }}
                              disabled={isProcessed}
                            />
                            <Label>{test.label}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section: TPI Parameters (conditional) */}
          {formData.tpiType === "TPI_CLIENT_QA" && (
            <>
              <Separator />
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide">
                    TPI / Client QA — Inspection Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* VDI Inspection */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="vdiRequired"
                        checked={formData.vdiRequired}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, vdiRequired: !!checked })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="vdiRequired">VDI Inspection</Label>
                    </div>
                    {formData.vdiRequired && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">
                          % Witness
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={formData.vdiWitnessPercent ?? ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vdiWitnessPercent: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          disabled={isProcessed}
                          className="h-8 w-24 text-sm"
                          placeholder="%"
                        />
                      </div>
                    )}
                  </div>

                  {/* Hydro Test */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hydroTestRequired"
                        checked={formData.hydroTestRequired}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            hydroTestRequired: !!checked,
                          })
                        }
                        disabled={isProcessed}
                      />
                      <Label htmlFor="hydroTestRequired">Hydro Test</Label>
                    </div>
                    {formData.hydroTestRequired && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">
                          % Witness
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={formData.hydroWitnessPercent ?? ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hydroWitnessPercent: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          disabled={isProcessed}
                          className="h-8 w-24 text-sm"
                          placeholder="%"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Lab Tests Required */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Lab Tests Required
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {LAB_TESTS.map((test) => (
                        <div
                          key={test.value}
                          className="flex items-center gap-1.5"
                        >
                          <Checkbox
                            checked={formData.requiredLabTests.includes(
                              test.value
                            )}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...formData.requiredLabTests, test.value]
                                : formData.requiredLabTests.filter(
                                    (t) => t !== test.value
                                  );
                              setFormData({
                                ...formData,
                                requiredLabTests: updated,
                              });
                            }}
                            disabled={isProcessed}
                          />
                          <Label className="text-xs">{test.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {/* Allotment section — visible after item is marked Processed */}
      {items[currentIndex]?.processing?.status === "PROCESSED" && allotmentAnalysis && (
        <Card className={allotmentConfirmed ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" : "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Stock Allotment
              {allotmentConfirmed && <Badge variant="default" className="text-xs">Allocated</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span>Ordered: <strong>{allotmentAnalysis.orderedQty} MTR</strong></span>
              <span>Available Stock: <strong className={allotmentAnalysis.availableStockQty > 0 ? "text-green-600" : "text-red-600"}>
                {allotmentAnalysis.availableStockQty} MTR
              </strong></span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Source</Label>
                <Select
                  value={allotmentSource}
                  onValueChange={(val) => {
                    setAllotmentSource(val);
                    const qty = allotmentAnalysis.remainingQty;
                    const avail = allotmentAnalysis.availableStockQty;
                    if (val === "STOCK") { setAllotmentStockQty(String(qty)); setAllotmentProcQty("0"); }
                    else if (val === "PROCUREMENT") { setAllotmentStockQty("0"); setAllotmentProcQty(String(qty)); }
                    else { setAllotmentStockQty(String(Math.min(avail, qty))); setAllotmentProcQty(String(Math.max(0, qty - avail))); }
                  }}
                  disabled={allotmentConfirmed}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK" disabled={allotmentAnalysis.availableStockQty <= 0}>Stock</SelectItem>
                    <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                    <SelectItem value="SPLIT" disabled={allotmentAnalysis.availableStockQty <= 0}>Split</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Stock Qty (MTR)</Label>
                <Input type="number" value={allotmentStockQty} onChange={(e) => setAllotmentStockQty(e.target.value)} disabled={allotmentConfirmed || allotmentSource === "PROCUREMENT"} min={0} step={0.001} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Procurement Qty (MTR)</Label>
                <Input type="number" value={allotmentProcQty} onChange={(e) => setAllotmentProcQty(e.target.value)} disabled={allotmentConfirmed || allotmentSource === "STOCK"} min={0} step={0.001} />
              </div>
            </div>

            {!allotmentConfirmed ? (
              <Button onClick={confirmAllotment} disabled={allottingItem} className="w-full">
                {allottingItem ? "Allocating..." : "Confirm Allotment"}
              </Button>
            ) : (
              <div className="text-sm text-green-700 dark:text-green-400 text-center">
                Allotment confirmed — {allotmentSource === "STOCK" ? "Warehouse notified" : allotmentSource === "PROCUREMENT" ? "Purchase Requisition created" : "Warehouse notified + PR created"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex <= 0 || saving}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveDraft}
            disabled={saving || isProcessed}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          {isProcessed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={reopenItem}
              disabled={saving}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reopen
            </Button>
          ) : (
            <Button size="sm" onClick={markProcessed} disabled={saving}>
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Mark as Processed
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={currentIndex >= items.length - 1 || saving}
          >
            Next
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
