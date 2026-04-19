"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { SmartCombobox } from "@/components/shared/smart-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, ArrowLeft, Building2, MapPin, ListChecks, FileText, Package, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { FittingSelect } from "@/components/shared/fitting-select";
import { FlangeSelect } from "@/components/shared/flange-select";
import { calculateWeightPerMeter } from "@/lib/weight-calculation";

type ItemCategory = "Pipe" | "Fitting" | "Flange";

interface QuotationItem {
  itemCategory: ItemCategory;
  materialCodeId: string;
  materialCodeLabel: string;
  product: string;
  material: string;
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

const emptyItem: QuotationItem = {
  itemCategory: "Pipe",
  materialCodeId: "",
  materialCodeLabel: "",
  product: "",
  material: "",
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

const GST_RATES = ["0", "5", "12", "18", "28"];

function getPipeType(product: string): "CS_AS" | "SS_DS" | null {
  const p = product.toUpperCase();
  if (p.startsWith("C.S.") || p.startsWith("A.S.")) return "CS_AS";
  if (p.startsWith("S.S.") || p.startsWith("D.S.")) return "SS_DS";
  return null;
}

export default function StandardQuotationPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StandardQuotationPage />
    </Suspense>
  );
}

function StandardQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    quotationType: "DOMESTIC",
    quotationCategory: "STANDARD",
    currency: "INR",
    validUpto: "",
    quotationDate: new Date().toISOString().split("T")[0],
    inquiryNo: "",
    inquiryDate: "",
    // New fields
    dealOwnerId: "",
    preparedById: "",
    nextActionDate: "",
    kindAttention: "",
    placeOfSupplyCity: "",
    placeOfSupplyState: "",
    placeOfSupplyCountry: "India",
    sourceTenderId: "",
  });

  // Financial controls
  const [taxRate, setTaxRate] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  const [rcmEnabled, setRcmEnabled] = useState(false);
  const [roundOff, setRoundOff] = useState(false);
  const [advanceToPay, setAdvanceToPay] = useState("");

  const [items, setItems] = useState<QuotationItem[]>([emptyItem]);
  const [terms, setTerms] = useState<{
    termName: string;
    termValue: string;
    isIncluded: boolean;
    isCustom: boolean;
    isHeadingEditable: boolean;
  }[]>([]);

  // Add New Client modal state
  const [showAddBuyerModal, setShowAddBuyerModal] = useState(false);
  const [newBuyerForm, setNewBuyerForm] = useState({ buyerName: "", designation: "", email: "", mobile: "" });
  const [addingBuyer, setAddingBuyer] = useState(false);

  // Add New Customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "", companyType: "BUYER", gstNo: "", addressLine1: "", city: "", state: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  const queryClient = useQueryClient();

  // Track previous currency for conversion
  const prevCurrencyRef = useRef<string>(formData.currency);

  // Preview quotation number
  const { data: previewData } = useQuery({
    queryKey: ["quotation-preview-number"],
    queryFn: async () => {
      const res = await fetch("/api/quotations/preview-number");
      if (!res.ok) throw new Error("Failed to fetch preview number");
      return res.json();
    },
    enabled: !editId,
  });

  // Fetch currencies with exchange rates
  const { data: currenciesData } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const res = await fetch("/api/masters/currencies");
      if (!res.ok) throw new Error("Failed to fetch currencies");
      return res.json();
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Fetch users for Deal Owner select
  const { data: usersData } = useQuery({
    queryKey: ["users-active"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch buyers filtered by customer
  const { data: buyersData } = useQuery({
    queryKey: ["buyers", formData.customerId],
    enabled: !!formData.customerId,
    queryFn: async () => {
      const res = await fetch(`/api/masters/buyers?customerId=${formData.customerId}`);
      if (!res.ok) throw new Error("Failed to fetch buyers");
      return res.json();
    },
  });

  // Auto-select the sole buyer when a customer has exactly one
  useEffect(() => {
    const buyers = buyersData?.buyers;
    if (buyers && buyers.length === 1 && !formData.buyerId) {
      setFormData((prev) => ({ ...prev, buyerId: buyers[0].id }));
    }
  }, [buyersData, formData.buyerId]);

  // Fetch sizes for Size dropdown
  const { data: sizesData } = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      const res = await fetch("/api/masters/sizes");
      if (!res.ok) throw new Error("Failed to fetch sizes");
      return res.json();
    },
  });

  // Fetch material codes for autocomplete — scoped to selected customer (only codes used in their past quotations)
  const { data: materialCodesData } = useQuery({
    queryKey: ["material-codes", formData.customerId],
    enabled: !!formData.customerId,
    queryFn: async () => {
      const res = await fetch(`/api/masters/material-codes?customerId=${formData.customerId}`);
      if (!res.ok) throw new Error("Failed to fetch material codes");
      return res.json();
    },
  });

  const materialCodes = materialCodesData?.materialCodes || [];

  // Fetch offer term templates filtered by quotation type
  const { data: templatesData } = useQuery({
    queryKey: ["offer-term-templates", formData.quotationType],
    queryFn: async () => {
      const res = await fetch(`/api/offer-term-templates?quotationType=${formData.quotationType}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

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

  const selectedCustomer = customersData?.customers?.find(
    (c: any) => c.id === formData.customerId
  );

  const selectedBuyer = buyersData?.buyers?.find(
    (b: any) => b.id === formData.buyerId
  );

  // Track whether we're loading from edit data — skip auto-currency effects until loaded
  const editLoadedRef = useRef(false);

  // Auto-set currency based on market type (skip in edit mode until data is loaded)
  useEffect(() => {
    if (editId && !editLoadedRef.current) return;
    if (formData.quotationType === "EXPORT" && formData.currency === "INR") {
      setFormData((prev) => ({ ...prev, currency: "USD" }));
    } else if (formData.quotationType === "DOMESTIC" && formData.currency !== "INR") {
      setFormData((prev) => ({ ...prev, currency: "INR" }));
    }
  }, [formData.quotationType]);

  // Auto-set currency from customer's defaultCurrency — only when customerType is absent (fallback)
  useEffect(() => {
    if (editId) return;
    if (selectedCustomer?.customerType) return; // customerType effect handles currency
    if (selectedCustomer?.defaultCurrency) {
      setFormData((prev) => ({ ...prev, currency: selectedCustomer.defaultCurrency }));
    }
  }, [selectedCustomer?.defaultCurrency]);

  // Auto-set market type and currency from customer's type (DOMESTIC/INTERNATIONAL)
  useEffect(() => {
    if (editId) return;
    if (!selectedCustomer?.customerType) return;
    if (selectedCustomer.customerType === "INTERNATIONAL") {
      setFormData((prev) => ({ ...prev, quotationType: "EXPORT", currency: "USD" }));
    } else {
      setFormData((prev) => ({ ...prev, quotationType: "DOMESTIC", currency: "INR" }));
    }
  }, [selectedCustomer?.customerType]);

  // Convert item prices when currency changes
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    const next = formData.currency;
    if (prev === next) return;
    prevCurrencyRef.current = next;

    const currencies: any[] = currenciesData?.currencies || [];
    const prevRate = parseFloat(currencies.find((c: any) => c.code === prev)?.exchangeRate ?? "1") || 1;
    const nextRate = parseFloat(currencies.find((c: any) => c.code === next)?.exchangeRate ?? "1") || 1;
    if (prevRate === nextRate) return;

    const hasRates = items.some((item) => parseFloat(item.unitRate) > 0);
    if (!hasRates) return;

    setItems((prevItems) =>
      prevItems.map((item) => {
        const oldRate = parseFloat(item.unitRate);
        if (!oldRate) return item;
        const newRate = parseFloat(((oldRate * prevRate) / nextRate).toFixed(4));
        const qty = parseFloat(item.quantity) || 0;
        const newAmount = parseFloat((newRate * qty).toFixed(2));
        return { ...item, unitRate: String(newRate), amount: String(newAmount) };
      })
    );
  }, [formData.currency]);

  // Clear GST fields when currency is not INR (only INR supports GST)
  // Also update any "Currency" term value to reflect selected currency
  useEffect(() => {
    if (formData.currency !== "INR") {
      setTaxRate("");
      setRcmEnabled(false);
    }
    // Auto-update currency term value
    setTerms((prev) => prev.map((t) =>
      t.termName.toLowerCase().includes("currency")
        ? { ...t, termValue: formData.currency }
        : t
    ));
  }, [formData.currency]);

  // Auto-fill place of supply from customer state
  useEffect(() => {
    if (selectedCustomer && !editId) {
      setFormData((prev) => ({
        ...prev,
        placeOfSupplyCity: selectedCustomer.city || prev.placeOfSupplyCity,
        placeOfSupplyState: selectedCustomer.state || prev.placeOfSupplyState,
        placeOfSupplyCountry: selectedCustomer.country || prev.placeOfSupplyCountry || "India",
      }));
    }
  }, [selectedCustomer, editId]);

  // Reset buyer when customer changes (but not during initial edit load)
  const initialEditLoadDone = useRef(false);
  useEffect(() => {
    if (editId && !initialEditLoadDone.current && editData?.quotation) {
      initialEditLoadDone.current = true;
      return;
    }
    setFormData((prev) => ({ ...prev, buyerId: "" }));
  }, [formData.customerId]);

  // Track the quotationType + customer combo that was last used to populate terms
  const termsLoadedForKey = useRef<string | null>(null);

  // Load terms: customer-specific first, then fall back to global templates
  useEffect(() => {
    if (!templatesData?.templates) return;

    const termsKey = `${formData.quotationType}|${formData.customerId || ""}`;

    // In edit mode, skip only the first load (saved terms will be set by the editData effect)
    if (editData?.quotation?.terms?.length > 0 && termsLoadedForKey.current === null) {
      termsLoadedForKey.current = termsKey;
      return;
    }

    // Reload terms when quotationType or customer changes
    if (termsLoadedForKey.current !== termsKey || termsLoadedForKey.current === null) {
      // Try customer-specific terms first
      if (formData.customerId) {
        fetch(`/api/masters/customers/${formData.customerId}/terms?quotationType=${formData.quotationType}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.terms?.length > 0) {
              setTerms(data.terms.map((t: any) => ({
                termName: t.termName,
                termValue: t.termValue || "",
                isIncluded: t.isIncluded ?? true,
                isCustom: false,
                isHeadingEditable: false,
              })));
            } else {
              // No customer-specific terms, use global templates
              setTerms(
                templatesData.templates.map((t: any) => ({
                  termName: t.termName,
                  termValue: t.termDefaultValue || "",
                  isIncluded: true,
                  isCustom: false,
                  isHeadingEditable: false,
                }))
              );
            }
          })
          .catch(() => {
            // Fallback to global templates on error
            setTerms(
              templatesData.templates.map((t: any) => ({
                termName: t.termName,
                termValue: t.termDefaultValue || "",
                isIncluded: true,
                isCustom: false,
                isHeadingEditable: false,
              }))
            );
          });
      } else {
        // No customer selected, use global templates
        setTerms(
          templatesData.templates.map((t: any) => ({
            termName: t.termName,
            termValue: t.termDefaultValue || "",
            isIncluded: true,
            isCustom: false,
            isHeadingEditable: false,
          }))
        );
      }
      termsLoadedForKey.current = termsKey;
    }
  }, [templatesData, formData.quotationType, formData.customerId]);

  const toggleTermIncluded = (index: number) => {
    const newTerms = [...terms];
    newTerms[index].isIncluded = !newTerms[index].isIncluded;
    setTerms(newTerms);
  };

  const updateTermValue = (index: number, value: string) => {
    const newTerms = [...terms];
    newTerms[index].termValue = value;
    setTerms(newTerms);
  };

  const updateTermName = (index: number, name: string) => {
    const newTerms = [...terms];
    newTerms[index].termName = name;
    setTerms(newTerms);
  };

  const addCustomTerm = () => {
    setTerms([
      ...terms,
      { termName: "", termValue: "", isIncluded: true, isCustom: true, isHeadingEditable: true },
    ]);
  };

  const removeCustomTerm = (index: number) => {
    if (terms[index].isCustom) setTerms(terms.filter((_, i) => i !== index));
  };

  // Fetch existing quotation for edit mode
  const { data: editData } = useQuery({
    queryKey: ["quotation-edit", editId],
    enabled: !!editId,
    queryFn: async () => {
      const res = await fetch(`/api/quotations/${editId}`);
      if (!res.ok) throw new Error("Failed to fetch quotation");
      return res.json();
    },
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (editData?.quotation) {
      const q = editData.quotation;
      setFormData({
        customerId: q.customerId || "",
        buyerId: q.buyerId || "",
        quotationType: q.quotationType || "DOMESTIC",
        quotationCategory: q.quotationCategory || "STANDARD",
        currency: q.currency || "INR",
        validUpto: q.validUpto ? new Date(q.validUpto).toISOString().split("T")[0] : "",
        quotationDate: q.quotationDate ? new Date(q.quotationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        inquiryNo: q.inquiryNo || "",
        inquiryDate: q.inquiryDate ? new Date(q.inquiryDate).toISOString().split("T")[0] : "",
        dealOwnerId: q.dealOwnerId || "",
        preparedById: q.preparedById || "",
        nextActionDate: q.nextActionDate ? new Date(q.nextActionDate).toISOString().split("T")[0] : "",
        kindAttention: q.kindAttention || "",
        placeOfSupplyCity: q.placeOfSupplyCity || "",
        placeOfSupplyState: q.placeOfSupplyState || "",
        placeOfSupplyCountry: q.placeOfSupplyCountry || "India",
        sourceTenderId: q.sourceTenderId || "",
      });
      setTaxRate(q.taxRate ? String(q.taxRate) : "");
      setAdditionalDiscount(q.additionalDiscount ? String(q.additionalDiscount) : "");
      setRcmEnabled(q.rcmEnabled || false);
      setRoundOff(q.roundOff || false);
      setAdvanceToPay(q.advanceToPay ? String(q.advanceToPay) : "");
      if (q.items?.length > 0) {
        setItems(q.items.map((item: any) => ({
          itemCategory: item.fittingId ? "Fitting" as ItemCategory : item.flangeId ? "Flange" as ItemCategory : "Pipe" as ItemCategory,
          materialCodeId: item.materialCodeId || "",
          materialCodeLabel: item.materialCodeLabel || item.materialCode?.code || "",
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeId: item.sizeId || "",
          sizeLabel: item.sizeLabel || "",
          nps: item.sizeNPS ? String(item.sizeNPS) : "",
          schedule: item.schedule || "",
          od: item.od ? String(item.od) : "",
          wt: item.wt ? String(item.wt) : "",
          length: item.length || "",
          ends: item.ends || "",
          quantity: String(item.quantity),
          unitRate: String(item.unitRate),
          amount: String(item.amount),
          uom: item.uom || "Mtr",
          delivery: item.delivery || "",
          remark: item.remark || "",
          unitWeight: item.unitWeight ? String(item.unitWeight) : "",
          totalWeightMT: item.totalWeightMT ? String(item.totalWeightMT) : "",
          taxRate: item.taxRate ? String(item.taxRate) : "",
          hsnCode: item.hsnCode || "",
          pastQuote: item.pastQuote || "",
          pastQuotePrice: item.pastQuotePrice ? String(item.pastQuotePrice) : "",
          pastPo: item.pastPo || "",
          pastPoPrice: item.pastPoPrice ? String(item.pastPoPrice) : "",
          fittingId: item.fittingId || "",
          fittingLabel: "",
          flangeId: item.flangeId || "",
          flangeLabel: "",
        })));
      }
      if (q.terms?.length > 0) {
        setTerms(q.terms.map((t: any) => ({
          termName: t.termName,
          termValue: t.termValue,
          isIncluded: t.isIncluded,
          isCustom: t.isCustom,
          isHeadingEditable: t.isHeadingEditable,
        })));
      }
      // Sync prevCurrencyRef so the currency conversion effect doesn't fire
      prevCurrencyRef.current = q.currency || "INR";
      // Mark edit as loaded so auto-currency effects can work for manual changes
      editLoadedRef.current = true;
    }
  }, [editData]);

  // Pre-fill from tender if tenderId is in URL params
  useEffect(() => {
    const tenderId = searchParams.get("tenderId");
    if (!tenderId) return;
    fetch(`/api/tenders/${tenderId}`)
      .then((r) => r.json())
      .then((tender) => {
        if (!tender?.id) return;
        setFormData((prev) => ({
          ...prev,
          customerId: tender.customerId || prev.customerId,
          kindAttention: tender.projectName || prev.kindAttention,
          sourceTenderId: tender.id,
        }));
        if (tender.items?.length > 0) {
          setItems(
            tender.items.map((ti: any) => ({
              ...emptyItem,
              product: ti.product || "",
              material: ti.material || "",
              additionalSpec: ti.additionalSpec || "",
              sizeLabel: ti.size || ti.sizeLabel || "",
              quantity: String(ti.quantity || ""),
              uom: ti.uom || "Mtr",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editId ? `/api/quotations/${editId}` : "/api/quotations";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save quotation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(editId ? "Quotation updated successfully" : `Quotation ${data.quotationNo} created successfully`);
      // Fire-and-forget: save current terms back to customer master
      if (formData.customerId) {
        fetch(`/api/masters/customers/${formData.customerId}/terms`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quotationType: formData.quotationType,
            terms: terms.map((t) => ({
              termName: t.termName,
              termValue: t.termValue,
              isIncluded: t.isIncluded,
            })),
          }),
        }).catch((err) => console.log("Failed to save terms to customer master:", err));
      }
      router.push(`/quotations/${data.id || editId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => setItems([...items, { ...emptyItem }]);

  // Fetch material history (past quote + PO) when material code is selected
  const fetchMaterialHistory = async (index: number, materialCodeId: string) => {
    if (!formData.customerId || !materialCodeId) return;
    try {
      const res = await fetch(
        `/api/quotations/material-history?customerId=${formData.customerId}&materialCodeId=${materialCodeId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => {
        const newItems = [...prev];
        const updated = { ...newItems[index] };
        if (data.pastQuote) {
          updated.pastQuote = data.pastQuote.quotationNo || "";
          updated.pastQuotePrice = data.pastQuote.unitRate != null ? String(data.pastQuote.unitRate) : "";
        } else {
          updated.pastQuote = "";
          updated.pastQuotePrice = "";
        }
        if (data.pastPo) {
          updated.pastPo = data.pastPo.poNumber || "";
          updated.pastPoPrice = data.pastPo.unitRate != null ? String(data.pastPo.unitRate) : "";
        } else {
          updated.pastPo = "";
          updated.pastPoPrice = "";
        }
        newItems[index] = updated;
        return newItems;
      });
    } catch {
      // Silently fail — not critical
    }
  };

  // Past quotations for customer dropdown
  const { data: pastQuotationsData } = useQuery({
    queryKey: ["pastQuotations", formData.customerId],
    enabled: !!formData.customerId,
    queryFn: async () => {
      const res = await fetch(`/api/quotations/past-prices?customerId=${formData.customerId}`);
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
    updateItem(index, "pastQuote", quotationNo);
    if (q.items.length === 1) {
      applyPastQuoteItemFields(index, q.items[0]);
    } else if (q.items.length > 1) {
      // Multiple items — show picker dialog
      setPastQuoteDialogIndex(index);
      setPastQuoteSelectedItems(q.items);
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

  const updateItem = (index: number, field: keyof QuotationItem, value: string) => {
    setItems((prev) => {
      const newItems = prev.map((item, i) => (i === index ? { ...item } : item));
      (newItems[index] as any)[field] = value;

      // When product changes, reset size-related fields
      if (field === "product") {
        newItems[index].sizeId = "";
        newItems[index].sizeLabel = "";
        newItems[index].nps = "";
        newItems[index].schedule = "";
        newItems[index].od = "";
        newItems[index].wt = "";
        newItems[index].unitWeight = "";
        newItems[index].totalWeightMT = "";
      }

      // When sizeId changes, auto-fill from pipe size master
      if (field === "sizeId" && value) {
        const pipeSize = findPipeSizeById(value);
        if (pipeSize) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (items.some((item) => !item.quantity || !item.unitRate)) {
      toast.error("Please fill quantity and unit rate for all items");
      return;
    }
    createMutation.mutate({
      ...formData,
      quotationDate: formData.quotationDate || undefined,
      inquiryNo: formData.inquiryNo || undefined,
      inquiryDate: formData.inquiryDate || undefined,
      dealOwnerId: formData.dealOwnerId || undefined,
      nextActionDate: formData.nextActionDate || undefined,
      kindAttention: formData.kindAttention || undefined,
      placeOfSupplyCity: formData.placeOfSupplyCity || undefined,
      placeOfSupplyState: formData.placeOfSupplyState || undefined,
      placeOfSupplyCountry: formData.placeOfSupplyCountry || undefined,
      taxRate: taxRate || undefined,
      additionalDiscount: additionalDiscount || undefined,
      rcmEnabled,
      roundOff,
      advanceToPay: advanceToPay || undefined,
      items,
      terms,
    });
  };

  // Totals calculations
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.totalWeightMT || "0"), 0);
  const parsedDiscount = parseFloat(additionalDiscount) || 0;
  const discountAmount = parsedDiscount > 0 ? (subtotal * parsedDiscount) / 100 : 0;
  const totalAfterDiscount = subtotal - discountAmount;
  const parsedTaxRate = parseFloat(taxRate) || 0;
  const taxAmount = (!rcmEnabled && parsedTaxRate > 0) ? (totalAfterDiscount * parsedTaxRate) / 100 : 0;
  const grandTotalBeforeRoundOff = totalAfterDiscount + taxAmount;
  const roundOffAmount = roundOff ? (Math.round(grandTotalBeforeRoundOff) - grandTotalBeforeRoundOff) : 0;
  const grandTotal = grandTotalBeforeRoundOff + roundOffAmount;

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const curr = formData.currency;
  const isINR = formData.currency === "INR";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/quotations/create")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Standard Quotation"
          description="Pipes, Fittings, Flanges from masters"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" />
              Quotation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Row 1 (xl:8 cols): Customer(2) | Buyer(2) | Quotation No | Rev No | Quotation Date | Follow Up Date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
              <div className="space-y-1.5 min-w-0 xl:col-span-2">
                <Label className="text-sm font-medium">Customer <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.customerId || "NONE"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value === "NONE" ? "" : value })
                    }
                  >
                    <SelectTrigger className="flex-1 min-w-0">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" disabled>Select customer</SelectItem>
                      {customersData?.customers?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowAddCustomerModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0 xl:col-span-2">
                <Label className="text-sm font-medium">Buyer (Attn.)</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.buyerId || "NONE"}
                    onValueChange={(value) => {
                      if (value === "__ADD_NEW__") {
                        setShowAddBuyerModal(true);
                        return;
                      }
                      setFormData({ ...formData, buyerId: value === "NONE" ? "" : value });
                    }}
                  >
                    <SelectTrigger className="flex-1 min-w-0">
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No buyer selected</SelectItem>
                      {buyersData?.buyers?.map((buyer: any) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.buyerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.customerId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setShowAddBuyerModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Quotation No.</Label>
                <Input
                  value={editId ? (editData?.quotation?.quotationNo || "") : (previewData?.previewNumber || "")}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rev. No.</Label>
                <Input
                  value={editId ? String(editData?.quotation?.version ?? 0) : "0"}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Quotation Date</Label>
                <Input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, quotationDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Follow Up Date</Label>
                <Input
                  type="date"
                  value={formData.nextActionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextActionDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Row 2 (xl:8 cols): Address(2) | Market Type | Currency | Inquiry No | Inquiry Date | Inquiry Owner | Prepared By */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
              <div className="space-y-1.5 xl:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <Input
                  value={
                    selectedCustomer
                      ? [selectedCustomer.addressLine1, selectedCustomer.addressLine2, selectedCustomer.city, selectedCustomer.state, selectedCustomer.country, selectedCustomer.pincode]
                          .filter(Boolean)
                          .join(", ")
                      : ""
                  }
                  readOnly
                  className="bg-muted"
                  placeholder="Select a customer to see address"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Market Type</Label>
                <Select
                  value={formData.quotationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quotationType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOMESTIC">Domestic</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Currency</Label>
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
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Inquiry No.</Label>
                <Input
                  value={formData.inquiryNo}
                  onChange={(e) => setFormData({ ...formData, inquiryNo: e.target.value })}
                  placeholder="Client inquiry ref."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Inquiry Date</Label>
                <Input
                  type="date"
                  value={formData.inquiryDate}
                  onChange={(e) => setFormData({ ...formData, inquiryDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Inquiry Owner</Label>
                <Select
                  value={formData.dealOwnerId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dealOwnerId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Unassigned</SelectItem>
                    {usersData?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Prepared By</Label>
                <Select
                  value={formData.preparedById || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preparedById: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Unassigned</SelectItem>
                    {usersData?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-primary" />
                Quotation Items
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select product then pick Size (NPS x Schedule) to auto-fill OD, WT, Weight
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => {
              const sizeOptions = getSizeOptionsForProduct(item.product);
              const hasPipeType = !!getPipeType(item.product);

              return (
                <div key={index} className="grid gap-4 p-4 border border-border/50 rounded-lg relative bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Item #{index + 1}</span>
                      <div className="flex rounded-md border overflow-hidden text-xs">
                        {(["Pipe", "Fitting", "Flange"] as ItemCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`px-3 py-1 transition-colors ${
                              item.itemCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-accent"
                            }`}
                            onClick={() => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...item, itemCategory: cat };
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
                                        uom: src.uom,
                                        delivery: src.delivery,
                                        unitWeight: src.unitWeight,
                                        fittingId: src.fittingId,
                                        fittingLabel: src.fittingLabel,
                                        flangeId: src.flangeId,
                                        flangeLabel: src.flangeLabel,
                                      };
                                      return newItems;
                                    });
                                  }}
                                >
                                  Item #{i + 1}{src.product ? ` — ${src.product}` : ""}
                                </DropdownMenuItem>
                              ) : null
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
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
                                };
                                return newItems;
                              });
                              fetchMaterialHistory(index, mc.id);
                            }}
                            onChange={(text) => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "" };
                                return newItems;
                              });
                            }}
                            displayFn={(mc: any) => `${mc.code}${mc.description ? ` — ${mc.description}` : ""}`}
                            filterFn={(mc: any, query) =>
                              mc.code.toLowerCase().includes(query.toLowerCase()) ||
                              (mc.description || "").toLowerCase().includes(query.toLowerCase())
                            }
                            placeholder="Search material code..."
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
                            placeholder={formData.customerId ? "Enter new material code" : "Select customer first"}
                            disabled={!formData.customerId}
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
                      onProductChange={(val) => updateItem(index, "product", val)}
                      onMaterialChange={(val) => updateItem(index, "material", val)}
                      onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                      showAdditionalSpec
                      onAutoFill={() => {
                        // Additional spec auto-fill handled by the component
                      }}
                    />
                    {item.itemCategory === "Fitting" ? (
                      <div className="space-y-1 lg:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-medium">Select Fitting <span className="text-destructive">*</span></Label>
                        <FittingSelect
                          value={item.fittingLabel}
                          onChange={(text) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = { ...newItems[index], fittingLabel: text, fittingId: "" };
                              return newItems;
                            });
                          }}
                          onSelect={(f) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = {
                                ...newItems[index],
                                fittingId: f.id,
                                fittingLabel: `${f.type} ${f.size} ${f.schedule || ""} ${f.endType || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim(),
                                product: f.type,
                                material: f.materialGrade,
                                sizeLabel: f.size,
                                additionalSpec: [f.endType, f.rating, f.standard].filter(Boolean).join(", "),
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    ) : item.itemCategory === "Flange" ? (
                      <div className="space-y-1 lg:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-medium">Select Flange <span className="text-destructive">*</span></Label>
                        <FlangeSelect
                          value={item.flangeLabel}
                          onChange={(text) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = { ...newItems[index], flangeLabel: text, flangeId: "" };
                              return newItems;
                            });
                          }}
                          onSelect={(f) => {
                            setItems((prev) => {
                              const newItems = [...prev];
                              newItems[index] = {
                                ...newItems[index],
                                flangeId: f.id,
                                flangeLabel: `${f.type} ${f.size} ${f.rating}# ${f.facing || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim(),
                                product: f.type,
                                material: f.materialGrade,
                                sizeLabel: f.size,
                                additionalSpec: [f.facing, f.rating + "#", f.standard].filter(Boolean).join(", "),
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Size (NPS x Sch) <span className="text-destructive">*</span></Label>
                          <SmartCombobox
                            options={sizeOptions}
                            value={item.sizeLabel || ""}
                            onSelect={(s: any) => updateItem(index, "sizeId", s.id)}
                            onChange={(text) => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...newItems[index], sizeLabel: text, sizeId: "" };
                                return newItems;
                              });
                            }}
                            displayFn={(s: any) => s.sizeLabel}
                            filterFn={(s: any, query) =>
                              s.sizeLabel.toLowerCase().includes(query.toLowerCase())
                            }
                            placeholder={hasPipeType ? "Search sizes..." : "Select product first"}
                            disabled={!hasPipeType}
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
                              <SelectItem value="5.8">5.8 Mtr</SelectItem>
                              <SelectItem value="6.0">6.0 Mtr</SelectItem>
                              <SelectItem value="6.1">6.1 Mtr</SelectItem>
                              <SelectItem value="9.0-11.8">9.0-11.8 Mtr</SelectItem>
                              <SelectItem value="5.8-6.1">5.8-6.1 Mtr</SelectItem>
                              <SelectItem value="Random">Random</SelectItem>
                              <SelectItem value="Fixed">Fixed</SelectItem>
                              <SelectItem value="Cut Length">Cut Length</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
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
                          <SelectItem value="BE">BE</SelectItem>
                          <SelectItem value="PE">PE</SelectItem>
                          <SelectItem value="NPTM">NPTM</SelectItem>
                          <SelectItem value="BSPT">BSPT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                          <SelectItem value="Mtr">Mtr</SelectItem>
                          <SelectItem value="Nos">Nos</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="MT">MT</SelectItem>
                          <SelectItem value="Feet">Feet</SelectItem>
                          <SelectItem value="Set">Set</SelectItem>
                          <SelectItem value="Lot">Lot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Unit Rate ({curr})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                        required
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

                  {/* Row 2 (xl:10 cols): OD | WT | Unit Wt | Total Wt | Past Quote# | Past Quote Price | Past PO# | Past PO Price | Remarks | Total */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 xl:grid-cols-10 gap-2">
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
                        disabled={!formData.customerId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select past quote" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">— None —</SelectItem>
                          {pastQuotations.filter((pq: any) => pq.quotationCategory === "STANDARD").map((pq: any) => (
                            <SelectItem key={pq.id} value={pq.quotationNo}>
                              {pq.quotationNo} {pq.contactPerson ? `[${pq.contactPerson}]` : ""} ({pq.quotationDate ? new Date(pq.quotationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"})
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

            {/* Grand Total */}
            <Separator className="mt-4" />
            <div className="flex justify-end pt-3">
              <div className="space-y-2 text-sm w-72">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{curr} {fmt(subtotal)}</span>
                </div>
                {totalWeight > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Total Weight</span>
                    <span>{totalWeight.toFixed(3)} MT</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between py-2">
                  <span className="font-bold text-lg">Grand Total</span>
                  <span className="font-bold text-lg text-primary">{curr} {fmt(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        {terms.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Terms & Conditions
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addCustomTerm}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Term
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {terms.map((term, index) => (
                  <div key={index} className="flex gap-3 items-start rounded-md py-0.5 px-2 hover:bg-muted/40 transition-colors">
                    <Checkbox
                      checked={term.isIncluded}
                      onCheckedChange={() => toggleTermIncluded(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 grid grid-cols-[180px_1fr] gap-3 items-start">
                      {term.isHeadingEditable ? (
                        <Input
                          value={term.termName}
                          onChange={(e) => updateTermName(index, e.target.value)}
                          placeholder="Term name"
                          className={!term.isIncluded ? "opacity-50" : ""}
                        />
                      ) : (
                        <p className={`text-sm font-medium pt-2 ${!term.isIncluded ? "opacity-50" : ""}`}>
                          {term.termName}
                        </p>
                      )}
                      <Input
                        value={term.termValue}
                        onChange={(e) => updateTermValue(index, e.target.value)}
                        className={!term.isIncluded ? "opacity-50" : ""}
                        placeholder="Term value..."
                      />
                    </div>
                    {term.isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomTerm(index)}
                        className="text-destructive hover:text-destructive mt-1 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 pb-4">
          <Button type="button" variant="ghost" onClick={() => router.push("/quotations/create")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : editId ? "Update Quotation" : "Save Quotation"}
          </Button>
        </div>
      </form>

      {/* Add New Client Modal */}
      <Dialog open={showAddBuyerModal} onOpenChange={setShowAddBuyerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client (Buyer)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Buyer Name *</Label>
              <Input
                value={newBuyerForm.buyerName}
                onChange={(e) => setNewBuyerForm({ ...newBuyerForm, buyerName: e.target.value })}
                placeholder="Enter buyer name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Designation</Label>
              <Input
                value={newBuyerForm.designation}
                onChange={(e) => setNewBuyerForm({ ...newBuyerForm, designation: e.target.value })}
                placeholder="e.g. Purchase Manager"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newBuyerForm.email}
                onChange={(e) => setNewBuyerForm({ ...newBuyerForm, email: e.target.value })}
                placeholder="buyer@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Mobile</Label>
              <Input
                value={newBuyerForm.mobile}
                onChange={(e) => setNewBuyerForm({ ...newBuyerForm, mobile: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBuyerModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newBuyerForm.buyerName.trim() || addingBuyer}
              onClick={async () => {
                setAddingBuyer(true);
                try {
                  const res = await fetch("/api/masters/buyers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      customerId: formData.customerId,
                      buyerName: newBuyerForm.buyerName.trim(),
                      designation: newBuyerForm.designation.trim() || undefined,
                      email: newBuyerForm.email.trim() || undefined,
                      mobile: newBuyerForm.mobile.trim() || undefined,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to create buyer");
                  }
                  const data = await res.json();
                  await queryClient.invalidateQueries({ queryKey: ["buyers", formData.customerId] });
                  setFormData((prev) => ({ ...prev, buyerId: data.id }));
                  setNewBuyerForm({ buyerName: "", designation: "", email: "", mobile: "" });
                  setShowAddBuyerModal(false);
                  toast.success("Client added successfully");
                } catch (err: any) {
                  toast.error(err.message || "Failed to add client");
                } finally {
                  setAddingBuyer(false);
                }
              }}
            >
              {addingBuyer ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Customer Modal */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Customer Name *</Label>
              <Input
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                placeholder="Enter customer/company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Company Type</Label>
                <Select
                  value={newCustomerForm.companyType}
                  onValueChange={(value) => setNewCustomerForm({ ...newCustomerForm, companyType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER">Buyer</SelectItem>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>GST No.</Label>
                <Input
                  value={newCustomerForm.gstNo}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstNo: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAACR5055K1ZK"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  value={newCustomerForm.city}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={newCustomerForm.addressLine1}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  value={newCustomerForm.state}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomerModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCustomerForm.name.trim() || addingCustomer}
              onClick={async () => {
                setAddingCustomer(true);
                try {
                  const res = await fetch("/api/masters/customers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: newCustomerForm.name.trim(),
                      companyType: newCustomerForm.companyType,
                      gstNo: newCustomerForm.gstNo.trim() || undefined,
                      addressLine1: newCustomerForm.addressLine1.trim() || undefined,
                      city: newCustomerForm.city.trim() || undefined,
                      state: newCustomerForm.state.trim() || undefined,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to create customer");
                  }
                  const data = await res.json();
                  await queryClient.invalidateQueries({ queryKey: ["customers"] });
                  setFormData((prev) => ({ ...prev, customerId: data.id }));
                  setNewCustomerForm({ name: "", companyType: "BUYER", gstNo: "", addressLine1: "", city: "", state: "" });
                  setShowAddCustomerModal(false);
                  toast.success("Customer created successfully");
                } catch (err: any) {
                  toast.error(err.message || "Failed to create customer");
                } finally {
                  setAddingCustomer(false);
                }
              }}
            >
              {addingCustomer ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <span className="font-medium truncate">{item.product || item.itemDescription || "—"}</span>
                  <span className="text-muted-foreground text-xs">{item.sizeLabel || "—"}</span>
                  <span className="font-semibold text-primary whitespace-nowrap">
                    {item.unitRate != null ? `₹${Number(item.unitRate).toLocaleString("en-IN")}` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.uom || "Unit"}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
