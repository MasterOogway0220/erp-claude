"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, ArrowLeft, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface QuotationItem {
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
  delivery: string;
  remark: string;
  unitWeight: string;
  totalWeightMT: string;
  taxRate: string;
  hsnCode: string;
}

const emptyItem: QuotationItem = {
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
  delivery: "6-8 Weeks",
  remark: "",
  unitWeight: "",
  totalWeightMT: "",
  taxRate: "",
  hsnCode: "",
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
    nextActionDate: "",
    kindAttention: "",
    placeOfSupplyCity: "",
    placeOfSupplyState: "",
    placeOfSupplyCountry: "India",
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

  // Fetch pipe sizes for Size dropdown
  const { data: pipeSizesData } = useQuery({
    queryKey: ["pipe-sizes"],
    queryFn: async () => {
      const res = await fetch("/api/masters/pipe-sizes");
      if (!res.ok) throw new Error("Failed to fetch pipe sizes");
      return res.json();
    },
  });

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
    const sizes = pipeSizesData?.pipeSizes || [];

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
  }, [pipeSizesData]);

  const findPipeSizeById = useMemo(() => {
    const sizes = pipeSizesData?.pipeSizes || [];
    const map = new Map<string, any>();
    sizes.forEach((s: any) => map.set(s.id, s));
    return (id: string) => map.get(id) || null;
  }, [pipeSizesData]);

  const selectedCustomer = customersData?.customers?.find(
    (c: any) => c.id === formData.customerId
  );

  const selectedBuyer = buyersData?.buyers?.find(
    (b: any) => b.id === formData.buyerId
  );

  // Auto-set currency based on market type
  useEffect(() => {
    if (formData.quotationType === "EXPORT" && formData.currency === "INR") {
      setFormData((prev) => ({ ...prev, currency: "USD" }));
    } else if (formData.quotationType === "DOMESTIC" && formData.currency !== "INR") {
      setFormData((prev) => ({ ...prev, currency: "INR" }));
    }
  }, [formData.quotationType]);

  // Auto-set currency from customer
  useEffect(() => {
    if (selectedCustomer?.defaultCurrency) {
      setFormData((prev) => ({ ...prev, currency: selectedCustomer.defaultCurrency }));
    }
  }, [selectedCustomer?.defaultCurrency]);

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
  useEffect(() => {
    if (formData.currency !== "INR") {
      setTaxRate("");
      setRcmEnabled(false);
    }
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

  // Reset buyer when customer changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, buyerId: "" }));
  }, [formData.customerId]);

  // Set terms from templates (skip if in edit mode with terms already loaded)
  useEffect(() => {
    if (templatesData?.templates && !(editData?.quotation?.terms?.length > 0)) {
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
  }, [templatesData]);

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
        nextActionDate: q.nextActionDate ? new Date(q.nextActionDate).toISOString().split("T")[0] : "",
        kindAttention: q.kindAttention || "",
        placeOfSupplyCity: q.placeOfSupplyCity || "",
        placeOfSupplyState: q.placeOfSupplyState || "",
        placeOfSupplyCountry: q.placeOfSupplyCountry || "India",
      });
      setTaxRate(q.taxRate ? String(q.taxRate) : "");
      setAdditionalDiscount(q.additionalDiscount ? String(q.additionalDiscount) : "");
      setRcmEnabled(q.rcmEnabled || false);
      setRoundOff(q.roundOff || false);
      setAdvanceToPay(q.advanceToPay ? String(q.advanceToPay) : "");
      if (q.items?.length > 0) {
        setItems(q.items.map((item: any) => ({
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
          delivery: item.delivery || "",
          remark: item.remark || "",
          unitWeight: item.unitWeight ? String(item.unitWeight) : "",
          totalWeightMT: item.totalWeightMT ? String(item.totalWeightMT) : "",
          taxRate: item.taxRate ? String(item.taxRate) : "",
          hsnCode: item.hsnCode || "",
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
    }
  }, [editData]);

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
      router.push(`/quotations/${data.id || editId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => setItems([...items, { ...emptyItem }]);

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
          newItems[index].od = parseFloat(pipeSize.od).toString();
          newItems[index].wt = parseFloat(pipeSize.wt).toString();
          newItems[index].unitWeight = parseFloat(pipeSize.weight).toString();
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
    <div className="space-y-6 max-w-7xl">
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
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Row 1: Customer + Buyer (large dropdowns, 2 per row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.customers?.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Buyer (Attn.)</Label>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No buyer selected</SelectItem>
                    {buyersData?.buyers?.map((buyer: any) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.buyerName}
                      </SelectItem>
                    ))}
                    {formData.customerId && (
                      <SelectItem value="__ADD_NEW__" className="text-primary font-medium">
                        ➕ Add New Client
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Market Type, Currency, Quotation No, Rev No (small fields, 4 per row) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Market Type</Label>
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

              <div className="grid gap-2">
                <Label>Currency</Label>
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

              <div className="grid gap-2">
                <Label>Quotation No.</Label>
                <Input
                  value={editId ? (editData?.quotation?.quotationNo || "") : (previewData?.previewNumber || "")}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="grid gap-2">
                <Label>Rev. No.</Label>
                <Input
                  value={editId ? String(editData?.quotation?.version ?? 0) : "0"}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Row 3: Dates (small fields, 4 per row) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Quotation Date</Label>
                <Input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, quotationDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formData.validUpto}
                  onChange={(e) =>
                    setFormData({ ...formData, validUpto: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Inquiry No.</Label>
                <Input
                  value={formData.inquiryNo}
                  onChange={(e) => setFormData({ ...formData, inquiryNo: e.target.value })}
                  placeholder="Client inquiry ref."
                />
              </div>

              <div className="grid gap-2">
                <Label>Inquiry Date</Label>
                <Input
                  type="date"
                  value={formData.inquiryDate}
                  onChange={(e) => setFormData({ ...formData, inquiryDate: e.target.value })}
                />
              </div>
            </div>

            {/* Row 4: Deal Owner, Next Action, Kind Attention (3 per row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Deal Owner</Label>
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

              <div className="grid gap-2">
                <Label>Next Action Date</Label>
                <Input
                  type="date"
                  value={formData.nextActionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextActionDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Kind Attention
                  <span className="text-xs text-muted-foreground ml-2">
                    ({(formData.kindAttention || "").length}/200)
                  </span>
                </Label>
                <Input
                  value={formData.kindAttention}
                  onChange={(e) =>
                    setFormData({ ...formData, kindAttention: e.target.value.slice(0, 200) })
                  }
                  placeholder="e.g. Mr. Rajesh Sharma, Purchase Manager"
                />
              </div>
            </div>

            {/* Customer + Buyer Info */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Customer Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  {(selectedCustomer.addressLine1 || selectedCustomer.city) && (
                    <div>
                      <span className="text-muted-foreground">Address:</span>{" "}
                      {[selectedCustomer.addressLine1, selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {selectedBuyer ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">Attn:</span>{" "}
                        {selectedBuyer.buyerName}
                        {selectedBuyer.designation && ` (${selectedBuyer.designation})`}
                      </div>
                      {selectedBuyer.email && (
                        <div>
                          <span className="text-muted-foreground">Buyer Email:</span> {selectedBuyer.email}
                        </div>
                      )}
                      {selectedBuyer.mobile && (
                        <div>
                          <span className="text-muted-foreground">Buyer Mobile:</span> {selectedBuyer.mobile}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {selectedCustomer.contactPerson && (
                        <div>
                          <span className="text-muted-foreground">Contact:</span> {selectedCustomer.contactPerson}
                        </div>
                      )}
                      {selectedCustomer.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span> {selectedCustomer.email}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Place of Supply — only relevant for GST (INR) */}
        {isINR && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Place of Supply</CardTitle>
                <span className="text-xs text-muted-foreground">(Determines CGST+SGST vs IGST)</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input
                    value={formData.placeOfSupplyCity}
                    onChange={(e) => setFormData({ ...formData, placeOfSupplyCity: e.target.value })}
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>State</Label>
                  <Input
                    value={formData.placeOfSupplyState}
                    onChange={(e) => setFormData({ ...formData, placeOfSupplyState: e.target.value })}
                    placeholder="e.g. Maharashtra"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.placeOfSupplyCountry}
                    onChange={(e) => setFormData({ ...formData, placeOfSupplyCountry: e.target.value })}
                    placeholder="India"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quotation Items</CardTitle>
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
                <div key={index} className="grid gap-4 p-4 border rounded-lg relative">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

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
                      if (fields.length) updateItem(index, "length", fields.length);
                    }}
                  />

                  {/* Size + Dimensions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="grid gap-2 md:col-span-2">
                      <Label>Size (NPS x Sch) *</Label>
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
                        placeholder={hasPipeType ? "Type to search sizes..." : "Select product first"}
                        disabled={!hasPipeType}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>OD (mm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.od}
                        onChange={(e) => updateItem(index, "od", e.target.value)}
                        placeholder="Auto"
                        readOnly={!!item.sizeId}
                        className={item.sizeId ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>WT (mm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.wt}
                        onChange={(e) => updateItem(index, "wt", e.target.value)}
                        placeholder="Auto"
                        readOnly={!!item.sizeId}
                        className={item.sizeId ? "bg-muted" : ""}
                      />
                    </div>
                  </div>

                  {/* Length, Ends, Qty, Rate */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label>Length</Label>
                      <Input
                        value={item.length}
                        onChange={(e) => updateItem(index, "length", e.target.value)}
                        placeholder="9.00-11.8"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ends</Label>
                      <Select
                        value={item.ends}
                        onValueChange={(value) => updateItem(index, "ends", value)}
                      >
                        <SelectTrigger>
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
                    <div className="grid gap-2">
                      <Label>Qty (Mtr) *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Unit Rate ({curr}) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Amount, HSN, GST, Delivery */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label>Amount ({curr})</Label>
                      <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                    </div>
                    <div className="grid gap-2">
                      <Label>HSN Code</Label>
                      <Input
                        value={item.hsnCode}
                        onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                        placeholder="e.g. 7304"
                      />
                    </div>
                    {isINR && (
                      <div className="grid gap-2">
                        <Label>GST Rate (%)</Label>
                        <Select
                          value={item.taxRate || "NONE"}
                          onValueChange={(value) => updateItem(index, "taxRate", value === "NONE" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">—</SelectItem>
                            {GST_RATES.map((r) => (
                              <SelectItem key={r} value={r}>{r}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label>Delivery</Label>
                      <Input
                        value={item.delivery}
                        onChange={(e) => updateItem(index, "delivery", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Remark + Weight */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Remark</Label>
                      <Input
                        value={item.remark}
                        onChange={(e) => updateItem(index, "remark", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">Unit Wt (kg/m)</Label>
                      <Input
                        value={item.unitWeight}
                        readOnly
                        className="bg-muted text-sm"
                        placeholder="Auto from size"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">Total Wt (MT)</Label>
                      <Input
                        value={item.totalWeightMT}
                        readOnly
                        className="bg-muted text-sm"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Tax rate + discount controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {isINR && (
                    <div className="grid gap-2">
                      <Label>Header GST Rate (%)</Label>
                      <Select
                        value={taxRate || "NONE"}
                        onValueChange={(v) => setTaxRate(v === "NONE" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">0% / Exempt</SelectItem>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={r}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Additional Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={additionalDiscount}
                      onChange={(e) => setAdditionalDiscount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {isINR && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rcm"
                        checked={rcmEnabled}
                        onCheckedChange={setRcmEnabled}
                      />
                      <Label htmlFor="rcm" className="cursor-pointer">
                        RCM (Reverse Charge)
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="roundoff"
                      checked={roundOff}
                      onCheckedChange={setRoundOff}
                    />
                    <Label htmlFor="roundoff" className="cursor-pointer">
                      Round-off
                    </Label>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Advance to Pay ({curr})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={advanceToPay}
                    onChange={(e) => setAdvanceToPay(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Right: Calculation breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{curr} {fmt(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between py-1 text-orange-600">
                      <span>Discount ({parsedDiscount}%)</span>
                      <span>− {curr} {fmt(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">After Discount</span>
                      <span className="font-medium">{curr} {fmt(totalAfterDiscount)}</span>
                    </div>
                  </>
                )}

                {isINR && parsedTaxRate > 0 && !rcmEnabled && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">GST ({parsedTaxRate}%)</span>
                    <span>{curr} {fmt(taxAmount)}</span>
                  </div>
                )}

                {isINR && rcmEnabled && (
                  <div className="flex justify-between py-1 text-amber-600">
                    <span>Tax (RCM — paid by buyer)</span>
                    <span>₹0.00</span>
                  </div>
                )}

                {roundOff && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Round-off</span>
                    <span>{roundOffAmount >= 0 ? "+" : ""}{curr} {fmt(roundOffAmount)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between py-2">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="font-bold text-base">{curr} {fmt(grandTotal)}</span>
                </div>

                {totalWeight > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Total Weight</span>
                    <span>{totalWeight.toFixed(3)} MT</span>
                  </div>
                )}

                {parseFloat(advanceToPay) > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Advance to Pay</span>
                    <span>{curr} {fmt(parseFloat(advanceToPay))}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/quotations/create")}>
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
                  setFormData((prev) => ({ ...prev, buyerId: data.buyer.id }));
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
    </div>
  );
}
