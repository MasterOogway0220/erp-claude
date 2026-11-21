"use client";

/**
 * The standard quotation's line-item editor: item type, material code,
 * product / material / additional spec, size (from the size masters), length,
 * ends, qty, unit, rate (with Regret), delivery, Dim. Std, OD / WT, weights,
 * past quote / past PO, remarks and line total.
 *
 * Shared by the standard quotation form and by client PO registration, where
 * a tender quotation that has no lines yet gets its items typed in with
 * exactly these fields. The parent owns the `items` array (it saves it and
 * totals it); everything about editing a line lives here.
 */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductMaterialSelect, getMasterExtraSizes } from "@/components/shared/product-material-select";
import { SmartCombobox } from "@/components/shared/smart-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  flangeDimForSize,
  getFittingDimStandard,
  getFittingEnds,
  getFittingSizeOptions,
  getFlangeSizeOptions,
} from "@/lib/fitting-flange-sizes";
import { calculateWeightPerMeter } from "@/lib/weight-calculation";
import { isSameItem, matchKey, wasGivenToClient, type PastQuoteMatchFields } from "@/lib/quotations/past-quote-match";
import { useUnits } from "@/hooks/use-units";
import { useReferenceQuery } from "@/hooks/use-api-query";

export type ItemCategory = "Pipe" | "Fitting" | "Flange" | "Plate";


export interface QuotationItem {
  itemCategory: ItemCategory;
  // Printed serial as per the client's inquiry; blank = auto (position).
  slNo: string;
  materialCodeId: string;
  materialCodeLabel: string;
  product: string;
  material: string;
  // Dimension standard printed in the "Dim." column (e.g. ASME B36.10).
  dimStandard: string;
  additionalSpec: string;
  sizeId: string;
  sizeLabel: string;
  nps: string;
  schedule: string;
  od: string;
  wt: string;
  length: string;
  ends: string;
  quantity: string;
  unitRate: string;
  // A line we decline to quote: no rate, no amount, prints REGRET on the PDF
  isRegret: boolean;
  amount: string;
  uom: string;
  delivery: string;
  remark: string;
  unitWeight: string;
  totalWeightMT: string;
  taxRate: string;
  hsnCode: string;
  pastQuote: string;
  pastQuotePrice: string;
  pastPo: string;
  pastPoPrice: string;
  fittingId: string;
  fittingLabel: string;
  flangeId: string;
  flangeLabel: string;
}

export const emptyItem: QuotationItem = {
  itemCategory: "Pipe",
  slNo: "",
  materialCodeId: "",
  materialCodeLabel: "",
  product: "",
  material: "",
  dimStandard: "",
  additionalSpec: "",
  sizeId: "",
  sizeLabel: "",
  nps: "",
  schedule: "",
  od: "",
  wt: "",
  length: "",
  ends: "BE",
  quantity: "",
  unitRate: "",
  isRegret: false,
  amount: "0.00",
  uom: "Mtr",
  delivery: "6-8 Weeks",
  remark: "",
  unitWeight: "",
  totalWeightMT: "",
  taxRate: "",
  hsnCode: "",
  pastQuote: "",
  pastQuotePrice: "",
  pastPo: "",
  pastPoPrice: "",
  fittingId: "",
  fittingLabel: "",
  flangeId: "",
  flangeLabel: "",
};

export function getPipeType(product: string): "CS_AS" | "SS_DS" | null {
  const p = product.toUpperCase();
  if (p.startsWith("C.S.") || p.startsWith("A.S.") || p.startsWith("L.T.C.S.")) return "CS_AS";
  if (p.startsWith("S.S.") || p.startsWith("D.S.")) return "SS_DS";
  return null;
}

export interface StandardItemsEditorProps {
  items: QuotationItem[];
  setItems: Dispatch<SetStateAction<QuotationItem[]>>;
  /** The client; scopes material codes and past quotes. */
  customerId: string;
  /** Currency code shown on the rate and total labels. */
  currency: string;
  /** The quotation being edited, so its own lines never count as its past quote. */
  editId?: string | null;
  /**
   * False while a saved quotation is still loading into `items`. The past-
   * quote lookup waits for it, and then treats the loaded lines as already
   * looked up (so opening a quotation never rewrites its stored past quote).
   */
  historyReady?: boolean;
}

export function StandardItemsEditor({
  items,
  setItems,
  customerId,
  currency,
  editId = null,
  historyReady = true,
}: StandardItemsEditorProps) {
  const queryClient = useQueryClient();
  const uomOptions = useUnits();
  const curr = currency;

  // Fetch sizes for Size dropdown
  const { data: sizesData } = useReferenceQuery<Record<string, any>>(["sizes"], "/api/masters/sizes");

  // Fetch lengths for the Length dropdown — driven by Length Master so entries
  // added under Masters > Products > Lengths show up here without a code change
  const { data: lengthsData } = useReferenceQuery<Record<string, any>>(["lengths"], "/api/masters/lengths");

  const lengthOptions: string[] = (lengthsData?.lengths || []).map((l: { label: string }) => l.label);

  // Fetch material codes for autocomplete — scoped to selected customer (only codes used in their past quotations)
  const { data: materialCodesData } = useReferenceQuery<Record<string, any>>(["material-codes", customerId, "STANDARD"], `/api/masters/material-codes?customerId=${customerId}&quotationCategory=STANDARD`, { enabled: !!customerId });

  const materialCodes = materialCodesData?.materialCodes || [];

  // Parse NPS numeric value from sizeLabel like '1/2" NB X Sch 40' for sorting
  const parseNpsFromLabel = (label: string): number => {
    const match = label.match(/^([\d/]+)/);
    if (!match) return 999;
    const frac = match[1];
    if (frac.includes("/")) {
      const [num, den] = frac.split("/").map(Number);
      return den ? num / den : num;
    }
    return parseFloat(frac) || 999;
  };

  // Derive combined size options filtered by pipe type
  const getSizeOptionsForProduct = useMemo(() => {
    const sizes = sizesData?.sizes || [];

    return (product: string) => {
      const pipeType = getPipeType(product);
      if (!pipeType) return [];

      return sizes
        .filter((s: any) => s.pipeType === pipeType)
        .sort((a: any, b: any) => {
          const npsA = a.nps != null ? parseFloat(a.nps) : parseNpsFromLabel(a.sizeLabel || "");
          const npsB = b.nps != null ? parseFloat(b.nps) : parseNpsFromLabel(b.sizeLabel || "");
          if (npsA !== npsB) return npsA - npsB;
          return (a.sizeLabel || "").localeCompare(b.sizeLabel || "");
        })
        .map((s: any) => ({
          id: s.id,
          sizeLabel: s.sizeLabel,
          nps: s.nps != null ? parseFloat(s.nps).toString() : "",
          schedule: s.schedule || "",
          od: parseFloat(s.od).toString(),
          wt: parseFloat(s.wt).toString(),
          weight: parseFloat(s.weight).toString(),
        }));
    };
  }, [sizesData]);

  const findPipeSizeById = useMemo(() => {
    const sizes = sizesData?.sizes || [];
    const map = new Map<string, any>();
    sizes.forEach((s: any) => map.set(s.id, s));
    return (id: string) => map.get(id) || null;
  }, [sizesData]);

  const addItem = () => setItems([...items, { ...emptyItem }]);

  // Past quote + past PO for a line. Looked up only when the line's product,
  // material, additional spec and size are all known, and only quotations we
  // actually gave this client count (see lib/quotations/past-quote-match).
  // A line that no longer matches anything has its past quote/PO cleared —
  // a past price for a different item is worse than none.
  const fetchMaterialHistory = async (index: number, line: QuotationItem) => {
    const key = matchKey(line);
    const clearHistory = (item: QuotationItem): QuotationItem => ({
      ...item, pastQuote: "", pastQuotePrice: "", pastPo: "", pastPoPrice: "",
    });
    const applyIfStillSame = (fn: (item: QuotationItem) => QuotationItem) =>
      setItems((prev) => {
        // The row may have been edited while the request was in flight.
        if (!prev[index] || matchKey(prev[index]) !== key) return prev;
        const newItems = [...prev];
        newItems[index] = fn(newItems[index]);
        return newItems;
      });

    if (!customerId || !key) {
      applyIfStillSame(clearHistory);
      return;
    }
    try {
      const params = new URLSearchParams({
        customerId: customerId,
        product: line.product,
        material: line.material,
        additionalSpec: line.additionalSpec,
        size: line.sizeLabel,
      });
      if (editId) params.set("excludeQuotationId", editId);
      const res = await fetch(`/api/quotations/material-history?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      applyIfStillSame((item) => {
        const updated = clearHistory(item);
        if (data.pastQuote) {
          updated.pastQuote = data.pastQuote.quotationNo || "";
          updated.pastQuotePrice = data.pastQuote.unitRate != null ? String(data.pastQuote.unitRate) : "";
          if (data.pastQuote.remark && !updated.remark) {
            updated.remark = data.pastQuote.remark;
          }
        }
        if (data.pastPo) {
          updated.pastPo = data.pastPo.poNumber || "";
          updated.pastPoPrice = data.pastPo.unitRate != null ? String(data.pastPo.unitRate) : "";
        }
        return updated;
      });
    } catch {
      // Silently fail — not critical
    }
  };

  // Re-run the lookup whenever a line's four matching fields (or the client)
  // change. Keys are remembered per row so unrelated edits (qty, rate) don't
  // refetch. On edit, the loaded lines are taken as already looked up, so
  // opening a saved quotation never rewrites its stored past quote.
  const historyKeysRef = useRef<string[] | null>(null);
  useEffect(() => {
    if (!historyReady) return;
    const keys = items.map((it) => `${customerId}#${matchKey(it)}`);
    if (historyKeysRef.current === null) {
      historyKeysRef.current = keys;
      if (editId) return;
    }
    // The ref holds the keys last looked up; it only advances when the
    // debounced lookup actually fires, so a quick follow-up edit to another
    // field can't swallow a pending lookup.
    const timer = setTimeout(() => {
      const prevKeys = historyKeysRef.current || [];
      historyKeysRef.current = keys;
      items.forEach((it, i) => {
        if (prevKeys[i] !== keys[i]) fetchMaterialHistory(i, it);
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, customerId]);

  // Past quotations for customer dropdown
  const { data: pastQuotationsData } = useQuery({
    queryKey: ["pastQuotations", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const res = await fetch(`/api/quotations/past-prices?customerId=${customerId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const pastQuotations = pastQuotationsData?.results || [];

  // When a past quotation is selected from dropdown, show item picker dialog
  const [pastQuoteDialogIndex, setPastQuoteDialogIndex] = useState<number | null>(null);
  const [pastQuoteSelectedItems, setPastQuoteSelectedItems] = useState<any[]>([]);

  const onPastQuoteSelect = (quotationNo: string, index: number) => {
    if (quotationNo === "NONE") {
      updateItem(index, "pastQuote", "");
      updateItem(index, "pastQuotePrice", "");
      return;
    }
    const q = pastQuotations.find((pq: any) => pq.quotationNo === quotationNo);
    if (!q) return;
    // Only this line's own item (same product/material/spec/size) is a
    // valid source of its past price.
    const matching = q.items.filter((it: PastQuoteMatchFields) => isSameItem(items[index], it));
    updateItem(index, "pastQuote", quotationNo);
    if (matching.length === 1) {
      applyPastQuoteItemFields(index, matching[0]);
    } else if (matching.length > 1) {
      // Same item quoted more than once on that quotation — let the user pick
      setPastQuoteDialogIndex(index);
      setPastQuoteSelectedItems(matching);
    }
  };

  const applyPastQuoteItemFields = (index: number, item: any) => {
    updateItem(index, "pastQuotePrice", item.unitRate ? String(item.unitRate) : "");
  };

  const selectPastQuoteItem = (item: any) => {
    if (pastQuoteDialogIndex === null) return;
    applyPastQuoteItemFields(pastQuoteDialogIndex, item);
    setPastQuoteDialogIndex(null);
    setPastQuoteSelectedItems([]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string | boolean) => {
    setItems((prev) => {
      const newItems = prev.map((item, i) => (i === index ? { ...item } : item));
      (newItems[index] as any)[field] = value;

      // Regretting a line drops its price: there is nothing to quote, so the
      // rate and the amount must not linger from before the toggle.
      if (field === "isRegret" && value) {
        newItems[index].unitRate = "";
        newItems[index].amount = "0.00";
        return newItems;
      }

      // When product changes, reset size-related fields — and dim/ends,
      // which belong to the previous product (autofill repopulates them).
      if (field === "product") {
        newItems[index].sizeId = "";
        newItems[index].sizeLabel = "";
        newItems[index].nps = "";
        newItems[index].schedule = "";
        newItems[index].od = "";
        newItems[index].wt = "";
        newItems[index].unitWeight = "";
        newItems[index].totalWeightMT = "";
        newItems[index].dimStandard = "";
        if (newItems[index].itemCategory !== "Pipe") newItems[index].ends = "";
      }

      // When sizeId changes, auto-fill from pipe size master
      if (field === "sizeId" && typeof value === "string" && value) {
        const pipeSize = findPipeSizeById(value);
        if (pipeSize) {
          // Default the dimension standard for pipes: stainless dimensions are
          // ASME B36.19, carbon/alloy B36.10. Editable, so odd cases can differ.
          if (!newItems[index].dimStandard) {
            newItems[index].dimStandard = /^S\.?S\b|STAINLESS/i.test(newItems[index].product || "")
              ? "ASME B36.19"
              : "ASME B36.10";
          }
          newItems[index].sizeLabel = pipeSize.sizeLabel;
          newItems[index].nps = pipeSize.nps != null ? parseFloat(pipeSize.nps).toString() : "";
          newItems[index].schedule = pipeSize.schedule || "";
          const od = parseFloat(pipeSize.od);
          const wt = parseFloat(pipeSize.wt);
          newItems[index].od = od.toString();
          newItems[index].wt = wt.toString();
          // Calculate weight per meter using formula based on pipe type
          const pt = getPipeType(newItems[index].product);
          const calcWeight = pt ? calculateWeightPerMeter(od, wt, pt) : null;
          newItems[index].unitWeight = calcWeight !== null
            ? calcWeight.toString()
            : parseFloat(pipeSize.weight).toString();
        }
      }

      // Recalculate amount
      if (field === "quantity" || field === "unitRate") {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const rate = parseFloat(newItems[index].unitRate) || 0;
        newItems[index].amount = (qty * rate).toFixed(2);
      }

      // Recalculate total weight when quantity or sizeId changes
      if (field === "quantity" || field === "unitRate" || field === "sizeId") {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const uw = parseFloat(newItems[index].unitWeight) || 0;
        if (qty > 0 && uw > 0) {
          newItems[index].totalWeightMT = ((qty * uw) / 1000).toFixed(3);
        } else {
          newItems[index].totalWeightMT = "";
        }
      }

      return newItems;
    });
  };

  return (
    <>
            {items.map((item, index) => {
              // Pipe sizes come from the pipe-size master (CS/AS/SS/DS pools)
              // plus any size typed against the product in Product Master —
              // the only source for N.A./Ti/Cu-Ni pipes, which have no pool.
              const poolSizes = getSizeOptionsForProduct(item.product);
              const sizeOptions = [
                ...poolSizes,
                ...getMasterExtraSizes(item.product)
                  .filter((l) => !poolSizes.some((s: { sizeLabel: string }) => s.sizeLabel === l))
                  .map((sizeLabel) => ({ id: "", sizeLabel })),
              ];
              // Free-typed / master-row size: the previous selection's
              // derived fields no longer apply — clear them (they are
              // readOnly and would print stale).
              const setFreeSize = (text: string) =>
                setItems((prev) => {
                  const newItems = [...prev];
                  newItems[index] = {
                    ...newItems[index],
                    sizeLabel: text,
                    sizeId: "",
                    nps: "",
                    schedule: "",
                    od: "",
                    wt: "",
                    unitWeight: "",
                    totalWeightMT: "",
                  };
                  return newItems;
                });

              return (
                <div key={index} className="grid gap-4 p-4 border border-border/50 rounded-lg relative bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm">Item #{index + 1}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Sl. No.</span>
                        <Input
                          value={item.slNo}
                          onChange={(e) => updateItem(index, "slNo", e.target.value)}
                          placeholder={String(index + 1)}
                          maxLength={20}
                          title="Serial number as per client inquiry (printed on the quotation)"
                          className="h-7 w-16 text-xs"
                        />
                      </div>
                      <div className="flex rounded-md border overflow-hidden text-xs">
                        {(["Pipe", "Fitting", "Flange", "Plate"] as ItemCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`px-3 py-1 transition-colors ${
                              item.itemCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-accent"
                            }`}
                            onClick={() => {
                              if (cat === item.itemCategory) return;
                              setItems((prev) => {
                                const newItems = [...prev];
                                // Product/material/size pools differ per
                                // category — clear them so stale values can't
                                // cross-map (e.g. a pipe product on a Fitting).
                                newItems[index] = {
                                  ...item,
                                  itemCategory: cat,
                                  product: "", material: "", additionalSpec: "",
                                  sizeId: "", sizeLabel: "", nps: "", schedule: "",
                                  od: "", wt: "", unitWeight: "", totalWeightMT: "",
                                  dimStandard: "", length: "",
                                  ends: cat === "Pipe" ? "BE" : "",
                                  // historical FK + label no longer describe this line
                                  fittingId: "", fittingLabel: "", flangeId: "", flangeLabel: "",
                                  // plates are traded by weight, pipes by length
                                  uom: cat === "Pipe" ? "Mtr" : cat === "Plate" ? "Kg" : "Nos",
                                };
                                return newItems;
                              });
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {items.length > 1 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                              <Copy className="h-3 w-3" />
                              Copy From
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {items.map((src, i) =>
                              i !== index ? (
                                <DropdownMenuItem
                                  key={i}
                                  onSelect={() => {
                                    setItems((old) => {
                                      const newItems = [...old];
                                      newItems[index] = {
                                        ...newItems[index],
                                        itemCategory: src.itemCategory,
                                        materialCodeId: src.materialCodeId,
                                        materialCodeLabel: src.materialCodeLabel,
                                        product: src.product,
                                        material: src.material,
                                        additionalSpec: src.additionalSpec,
                                        sizeId: src.sizeId,
                                        sizeLabel: src.sizeLabel,
                                        nps: src.nps,
                                        schedule: src.schedule,
                                        od: src.od,
                                        wt: src.wt,
                                        length: src.length,
                                        ends: src.ends,
                                        dimStandard: src.dimStandard,
                                        uom: src.uom,
                                        delivery: src.delivery,
                                        unitWeight: src.unitWeight,
                                        // recompute against the target's qty
                                        totalWeightMT:
                                          parseFloat(newItems[index].quantity) > 0 && parseFloat(src.unitWeight) > 0
                                            ? ((parseFloat(newItems[index].quantity) * parseFloat(src.unitWeight)) / 1000).toFixed(3)
                                            : "",
                                        fittingId: src.fittingId,
                                        fittingLabel: src.fittingLabel,
                                        flangeId: src.flangeId,
                                        flangeLabel: src.flangeLabel,
                                      };
                                      return newItems;
                                    });
                                  }}
                                >
                                  Item #{i + 1}{src.product ? `: ${src.product}` : ""}
                                </DropdownMenuItem>
                              ) : null
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Row 1 (xl:11 cols): Material Code | Product | Material | Additional Spec | Size/Fitting/Flange | Length | Ends | Qty | UOM | Unit Rate | Delivery */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Material Code</Label>
                      <div className="flex gap-1">
                        {materialCodes.length > 0 ? (
                          <SmartCombobox
                            options={materialCodes}
                            value={item.materialCodeLabel || ""}
                            onSelect={(mc: any) => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = {
                                  ...newItems[index],
                                  materialCodeId: mc.id,
                                  materialCodeLabel: mc.code,
                                  ...(mc.productType ? { product: mc.productType } : {}),
                                  ...(mc.materialGrade ? { material: mc.materialGrade } : {}),
                                  ...(mc.standard ? { additionalSpec: mc.standard } : {}),
                                  ...(mc.size ? { sizeLabel: mc.size } : {}),
                                  // Autofill changed product/size — a prior
                                  // sizeId (and its derived dims/weights) no
                                  // longer describes this line; clear like
                                  // updateItem's product reset does.
                                  ...(mc.productType || mc.size
                                    ? { sizeId: "", nps: "", schedule: "", od: "", wt: "", unitWeight: "", totalWeightMT: "" }
                                    : {}),
                                };
                                return newItems;
                              });
                            }}
                            onChange={(text) => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "" };
                                return newItems;
                              });
                            }}
                            displayFn={(mc: any) => `${mc.code}${mc.description ? `: ${mc.description}` : ""}`}
                            filterFn={(mc: any, query) =>
                              mc.code.toLowerCase().includes(query.toLowerCase()) ||
                              (mc.description || "").toLowerCase().includes(query.toLowerCase())
                            }
                            placeholder="Search material code..."
                            inputClassName="h-8"
                          />
                        ) : (
                          <Input
                            value={item.materialCodeLabel || ""}
                            onChange={(e) => {
                              const text = e.target.value;
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "" };
                                return newItems;
                              });
                            }}
                            placeholder={customerId ? "Enter new material code" : "Select customer first"}
                            disabled={!customerId}
                            className="h-8"
                          />
                        )}
                        {item.materialCodeLabel && item.product && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-[10px] whitespace-nowrap shrink-0"
                            title="Save this material code and product specs to Material Code Master"
                            onClick={async () => {
                              const code = item.materialCodeLabel.trim();
                              if (!code) { toast.error("Material Code is required"); return; }
                              try {
                                // Build size label from item fields
                                const sizeLabel = item.sizeLabel || "";
                                // Check for duplicates with same product specs but different code
                                const checkRes = await fetch("/api/masters/material-codes/check-duplicate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    productType: item.product,
                                    materialGrade: item.material,
                                    size: sizeLabel,
                                    schedule: item.schedule,
                                    code,
                                  }),
                                });
                                const checkData = await checkRes.json();
                                if (checkData.duplicates?.length > 0) {
                                  const dup = checkData.duplicates[0];
                                  const replace = window.confirm(
                                    `A product with same specifications exists in the master with material code "${dup.code}".\n\nDo you want to replace it with "${code}"?`
                                  );
                                  if (!replace) return;
                                  // Update the existing record with new code
                                  const updateRes = await fetch(`/api/masters/material-codes/${dup.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ code }),
                                  });
                                  if (!updateRes.ok) {
                                    const err = await updateRes.json().catch(() => ({}));
                                    throw new Error(err.error || "Failed to update material code");
                                  }
                                  const updated = await updateRes.json();
                                  setItems((prev) => {
                                    const newItems = [...prev];
                                    newItems[index] = { ...newItems[index], materialCodeId: updated.id, materialCodeLabel: code };
                                    return newItems;
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["material-codes"] });
                                  toast.success(`Material code updated from "${dup.code}" to "${code}"`);
                                  return;
                                }
                                // No duplicate — create new
                                const desc = [item.product, item.material, item.additionalSpec, sizeLabel, item.schedule].filter(Boolean).join(" ");
                                const createRes = await fetch("/api/masters/material-codes", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    code,
                                    productType: item.product,
                                    materialGrade: item.material,
                                    size: sizeLabel,
                                    odSize: item.od || null,
                                    nbSize: item.nps || null,
                                    thickness: item.wt || null,
                                    schedule: item.schedule || null,
                                    standard: item.additionalSpec || null,
                                    description: desc,
                                  }),
                                });
                                if (!createRes.ok) {
                                  const err = await createRes.json().catch(() => ({}));
                                  throw new Error(err.error || "Failed to create material code");
                                }
                                const created = await createRes.json();
                                setItems((prev) => {
                                  const newItems = [...prev];
                                  newItems[index] = { ...newItems[index], materialCodeId: created.id, materialCodeLabel: code };
                                  return newItems;
                                });
                                queryClient.invalidateQueries({ queryKey: ["material-codes"] });
                                toast.success("Material code recorded successfully");
                              } catch (err: any) {
                                toast.error(err.message || "Failed to record material code");
                              }
                            }}
                          >
                            Record
                          </Button>
                        )}
                      </div>
                    </div>
                    <ProductMaterialSelect
                      className="sm:col-span-3 lg:col-span-3 xl:col-span-3"
                      product={item.product}
                      material={item.material}
                      additionalSpec={item.additionalSpec}
                      category={
                        item.itemCategory === "Fitting" ? "FITTINGS"
                        : item.itemCategory === "Flange" ? "FLANGES"
                        : item.itemCategory === "Plate" ? "PLATES"
                        : "PIPES"
                      }
                      onProductChange={(val) => updateItem(index, "product", val)}
                      onMaterialChange={(val) => updateItem(index, "material", val)}
                      onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                      showAdditionalSpec
                      onAutoFill={({ ends, dimStandard, size }) => {
                        setItems((prev) => {
                          const newItems = [...prev];
                          newItems[index] = {
                            ...newItems[index],
                            // a plate has no end connection and the field is
                            // hidden, so an autofilled value could never be seen
                            // or corrected — but would still print
                            ends:
                              newItems[index].itemCategory === "Plate"
                                ? ""
                                : ends || newItems[index].ends,
                            // "" clears a stale dim for dim-less materials
                            dimStandard: dimStandard ?? newItems[index].dimStandard,
                            // An existing entry is the user's — only fill a
                            // blank one. A CS/SS pipe's label must come via
                            // sizeId (derives OD/WT/weight), so skip those; a
                            // pipe with no size pool (N.A., Ti…) takes the
                            // master-row size, its only source.
                            sizeLabel:
                              newItems[index].sizeLabel ||
                              (newItems[index].itemCategory !== "Pipe" || !getPipeType(newItems[index].product)
                                ? size || ""
                                : ""),
                          };
                          return newItems;
                        });
                      }}
                    />
                    {item.itemCategory === "Fitting" ? (
                      <div className="space-y-1 lg:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-medium">Size <span className="text-destructive">*</span></Label>
                        <SmartCombobox
                          options={Array.from(new Set([...getFittingSizeOptions(item.product, item.ends), ...getMasterExtraSizes(item.product)]))}
                          value={item.sizeLabel || ""}
                          onSelect={(label: string) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = {
                                ...newItems[index],
                                sizeLabel: label,
                                ends: newItems[index].ends || getFittingEnds(item.product),
                                dimStandard: newItems[index].dimStandard || getFittingDimStandard(item.product),
                              };
                              return newItems;
                            });
                          }}
                          onChange={(text) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = { ...newItems[index], sizeLabel: text };
                              return newItems;
                            });
                          }}
                          displayFn={(s: string) => s}
                          filterFn={(s: string, query) => s.toLowerCase().includes(query.toLowerCase())}
                          placeholder={item.product ? "Search sizes..." : "Select product first"}
                        />
                      </div>
                    ) : item.itemCategory === "Flange" ? (
                      <div className="space-y-1 lg:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-medium">Size <span className="text-destructive">*</span></Label>
                        <SmartCombobox
                          options={Array.from(new Set([...getFlangeSizeOptions(item.product), ...getMasterExtraSizes(item.product)]))}
                          value={item.sizeLabel || ""}
                          onSelect={(label: string) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = {
                                ...newItems[index],
                                sizeLabel: label,
                                // B16.47 sizes leave this blank on purpose —
                                // the size can't say Sr. A from Sr. B, so
                                // guessing B16.5 would print the wrong standard.
                                dimStandard: newItems[index].dimStandard || flangeDimForSize(label) || "",
                              };
                              return newItems;
                            });
                          }}
                          onChange={(text) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = { ...newItems[index], sizeLabel: text };
                              return newItems;
                            });
                          }}
                          displayFn={(s: string) => s}
                          filterFn={(s: string, query) => s.toLowerCase().includes(query.toLowerCase())}
                          placeholder={item.product ? "Search sizes..." : "Select product first"}
                        />
                      </div>
                    ) : item.itemCategory === "Plate" ? (
                      <div className="space-y-1 lg:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-medium">Size (W x L x Thk) <span className="text-destructive">*</span></Label>
                        {/* No plate size master exists — the only sizes are the
                            ones typed against the product in Product Master, so
                            this is free text with those as suggestions. The
                            placeholder mirrors how plates are already written
                            on existing quotations. */}
                        <SmartCombobox
                          options={getMasterExtraSizes(item.product)}
                          value={item.sizeLabel || ""}
                          onSelect={(label: string) => updateItem(index, "sizeLabel", label)}
                          onChange={(text) => updateItem(index, "sizeLabel", text)}
                          displayFn={(s: string) => s}
                          filterFn={(s: string, query) => s.toLowerCase().includes(query.toLowerCase())}
                          placeholder="e.g., 150MM W X 500MM L X 10MM THK"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Size (NPS x Sch) <span className="text-destructive">*</span></Label>
                          <SmartCombobox
                            options={sizeOptions}
                            value={item.sizeLabel || ""}
                            onSelect={(s: any) => (s.id ? updateItem(index, "sizeId", s.id) : setFreeSize(s.sizeLabel))}
                            onChange={setFreeSize}
                            displayFn={(s: any) => s.sizeLabel}
                            filterFn={(s: any, query) =>
                              s.sizeLabel.toLowerCase().includes(query.toLowerCase())
                            }
                            placeholder={
                              !item.product
                                ? "Select product first"
                                : sizeOptions.length === 0
                                  ? "No sizes in master: type manually"
                                  : "Search sizes..."
                            }
                            disabled={!item.product}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Length</Label>
                          <Select
                            value={item.length || "__none__"}
                            onValueChange={(value) => updateItem(index, "length", value === "__none__" ? "" : value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select</SelectItem>
                              {/* An older quotation can hold a length that is not (or no longer) in
                                  the master: keep it selectable so editing does not blank it. */}
                              {item.length && !lengthOptions.includes(item.length) && (
                                <SelectItem value={item.length}>{item.length}</SelectItem>
                              )}
                              {lengthOptions.map((label) => (
                                <SelectItem key={label} value={label}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    {/* Plates have no end connection — the column prints "-" */}
                    {item.itemCategory !== "Plate" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Ends</Label>
                      <Select
                        value={item.ends}
                        onValueChange={(value) => updateItem(index, "ends", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(item.itemCategory === "Fitting"
                            ? ["BW", "SW", "NPT"]
                            : item.itemCategory === "Flange"
                              ? ["RF", "FF", "RTJ"]
                              : ["BE", "PE", "NPTM", "BSPT"]
                          ).map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Qty <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        required
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Unit</Label>
                      <Select
                        value={item.uom}
                        onValueChange={(value) => updateItem(index, "uom", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* An older row can hold a UOM since removed from
                              Unit Master (e.g. "MTR"): keep it selectable so
                              editing shows the stored value, not a blank. */}
                          {item.uom && !uomOptions.includes(item.uom) && (
                            <SelectItem value={item.uom}>{item.uom}</SelectItem>
                          )}
                          {uomOptions.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-medium">Unit Rate ({curr})</Label>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isRegret}
                            onChange={(e) => updateItem(index, "isRegret", e.target.checked)}
                            className="h-3 w-3"
                          />
                          Regret
                        </label>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.isRegret ? "" : item.unitRate}
                        placeholder={item.isRegret ? "REGRET" : undefined}
                        disabled={item.isRegret}
                        onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Delivery</Label>
                      <Input
                        value={item.delivery}
                        onChange={(e) => updateItem(index, "delivery", e.target.value)}
                        placeholder="6-8 Weeks"
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Row 2 (xl:11 cols): Dim. | OD | WT | Unit Wt | Total Wt | Past Quote# | Past Quote Price | Past PO# | Past PO Price | Remarks | Total */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-11 xl:grid-cols-11 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Dim. Std</Label>
                      <Input
                        value={item.dimStandard}
                        onChange={(e) => updateItem(index, "dimStandard", e.target.value)}
                        placeholder="ASME B36.10"
                        title="Dimension standard printed in the Dim. column (e.g. ASME B36.10, ASME B16.5)"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">OD (mm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.od}
                        onChange={(e) => updateItem(index, "od", e.target.value)}
                        placeholder="Auto"
                        readOnly={!!item.sizeId}
                        className={`h-8 ${item.sizeId ? "bg-muted" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">WT (mm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.wt}
                        onChange={(e) => updateItem(index, "wt", e.target.value)}
                        placeholder="Auto"
                        readOnly={!!item.sizeId}
                        className={`h-8 ${item.sizeId ? "bg-muted" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unit WT (Kg/m)</Label>
                      <Input
                        value={item.unitWeight}
                        readOnly
                        className="bg-muted h-8 text-sm"
                        placeholder="Auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total WT (MT)</Label>
                      <Input
                        value={item.totalWeightMT}
                        readOnly
                        className="bg-muted h-8 text-sm"
                        placeholder="Auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Past Quote#</Label>
                      <Select
                        value={item.pastQuote || "NONE"}
                        onValueChange={(v) => onPastQuoteSelect(v, index)}
                        disabled={!customerId || !matchKey(item)}
                      >
                        <SelectTrigger className="h-8 text-sm" title={!matchKey(item) ? "Fill product, material and size first" : undefined}>
                          <SelectValue placeholder="Select past quote" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">- None -</SelectItem>
                          {/* Only quotes given to this client that carry this same item */}
                          {pastQuotations.filter((pq: any) =>
                            pq.quotationCategory === "STANDARD" &&
                            pq.id !== editId &&
                            wasGivenToClient(pq.status) &&
                            pq.items.some((it: PastQuoteMatchFields) => isSameItem(item, it))
                          ).map((pq: any) => (
                            <SelectItem key={pq.id} value={pq.quotationNo}>
                              {pq.quotationNo} {pq.contactPerson ? `[${pq.contactPerson}]` : ""} ({pq.quotationDate ? new Date(pq.quotationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "-"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Past Quote Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.pastQuotePrice}
                        onChange={(e) => updateItem(index, "pastQuotePrice", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Past PO#</Label>
                      <Input
                        value={item.pastPo}
                        onChange={(e) => updateItem(index, "pastPo", e.target.value)}
                        placeholder="PO ref"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Past PO Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.pastPoPrice}
                        onChange={(e) => updateItem(index, "pastPoPrice", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Remarks</Label>
                      <Input
                        value={item.remark}
                        onChange={(e) => updateItem(index, "remark", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Total ({curr})</Label>
                      <Input value={item.amount} readOnly className="bg-muted h-8 font-semibold" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add at the bottom — no scroll-back-up after finishing an item */}
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>

            {/* Past Quote Item Picker Dialog (when selected quotation has multiple items) */}
            <Dialog open={pastQuoteDialogIndex !== null && pastQuoteSelectedItems.length > 0} onOpenChange={(open) => { if (!open) { setPastQuoteDialogIndex(null); setPastQuoteSelectedItems([]); } }}>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Select Item for Price</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[60vh]">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      <span>Product / Description</span>
                      <span>Size</span>
                      <span>Rate</span>
                      <span>UOM</span>
                    </div>
                    {pastQuoteSelectedItems.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm hover:bg-muted/60 rounded-md transition-colors text-left items-center"
                        onClick={() => selectPastQuoteItem(item)}
                      >
                        <span className="font-medium truncate">{item.product || item.itemDescription || "-"}</span>
                        <span className="text-muted-foreground text-xs">{item.sizeLabel || "-"}</span>
                        <span className="font-semibold text-primary whitespace-nowrap">
                          {item.unitRate != null ? `₹${Number(item.unitRate).toLocaleString("en-IN")}` : "-"}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.uom || "Unit"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
    </>
  );
}
