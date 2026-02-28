"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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

interface NonStdItem {
  itemDescription: string;
  materialCode: string;
  size: string;
  endType: string;
  material: string;
  tagNo: string;
  drawingRef: string;
  itemNo: string;
  certificateReq: string;
  quantity: string;
  unitRate: string;
  amount: string;
  delivery: string;
}

const GST_RATES = ["0", "5", "12", "18", "28"];

const emptyItem: NonStdItem = {
  itemDescription: "",
  materialCode: "",
  size: "",
  endType: "",
  material: "",
  tagNo: "",
  drawingRef: "",
  itemNo: "",
  certificateReq: "",
  quantity: "",
  unitRate: "",
  amount: "0.00",
  delivery: "8-10 Weeks, Ex-works",
};


export default function NonStandardQuotationPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NonStandardQuotationPage />
    </Suspense>
  );
}

function NonStandardQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    quotationType: "DOMESTIC",
    quotationCategory: "NON_STANDARD",
    currency: "INR",
    validUpto: "",
    quotationDate: new Date().toISOString().split("T")[0],
    inquiryNo: "",
    inquiryDate: "",
    placeOfSupplyCity: "",
    placeOfSupplyState: "",
    placeOfSupplyCountry: "India",
    dealOwnerId: "",
    nextActionDate: "",
    kindAttention: "",
  });
  const [items, setItems] = useState<NonStdItem[]>([emptyItem]);
  const [terms, setTerms] = useState<{
    termName: string;
    termValue: string;
    isIncluded: boolean;
    isCustom: boolean;
    isHeadingEditable: boolean;
  }[]>([]);
  const [useStructuredInput, setUseStructuredInput] = useState<boolean[]>([true]);

  // Financial controls
  const [taxRate, setTaxRate] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  const [rcmEnabled, setRcmEnabled] = useState(false);
  const [roundOff, setRoundOff] = useState(false);
  const [advanceToPay, setAdvanceToPay] = useState("");

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

  // Fetch users for Deal Owner dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
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

  // Reset buyer when customer changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, buyerId: "" }));
  }, [formData.customerId]);

  // Track the quotationType that was last used to populate terms
  const termsLoadedForType = useRef<string | null>(null);

  // Set terms from templates when quotationType changes or on initial create
  useEffect(() => {
    if (!templatesData?.templates) return;

    // In edit mode, skip only the first load (saved terms will be set by the editData effect)
    if (editData?.quotation?.terms?.length > 0 && termsLoadedForType.current === null) {
      termsLoadedForType.current = formData.quotationType;
      return;
    }

    // Reload terms when quotationType changes or on initial create
    if (termsLoadedForType.current !== formData.quotationType || termsLoadedForType.current === null) {
      setTerms(
        templatesData.templates.map((t: any) => ({
          termName: t.termName,
          termValue: t.termDefaultValue || "",
          isIncluded: true,
          isCustom: false,
          isHeadingEditable: false,
        }))
      );
      termsLoadedForType.current = formData.quotationType;
    }
  }, [templatesData, formData.quotationType]);

  // Build description from structured fields
  const buildDescription = (item: NonStdItem): string => {
    const lines: string[] = [];
    if (item.materialCode) lines.push(`MATERIAL CODE: ${item.materialCode}`);
    if (item.itemDescription) lines.push(item.itemDescription);
    if (item.size) lines.push(`SIZE: ${item.size}`);
    if (item.endType) lines.push(`END TYPE: ${item.endType}`);
    if (item.material) lines.push(`MATERIAL: ${item.material}`);
    if (item.tagNo) lines.push(`TAG NUMBER: ${item.tagNo}`);
    if (item.drawingRef) lines.push(`DWG: ${item.drawingRef}`);
    if (item.itemNo) lines.push(`ITEM NO.: ${item.itemNo}`);
    if (item.certificateReq) {
      lines.push("");
      lines.push(`CERTIFICATE REQUIRED: ${item.certificateReq}`);
    }
    return lines.join("\n");
  };

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
        quotationCategory: q.quotationCategory || "NON_STANDARD",
        currency: q.currency || "INR",
        validUpto: q.validUpto ? new Date(q.validUpto).toISOString().split("T")[0] : "",
        quotationDate: q.quotationDate ? new Date(q.quotationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        inquiryNo: q.inquiryNo || "",
        inquiryDate: q.inquiryDate ? new Date(q.inquiryDate).toISOString().split("T")[0] : "",
        placeOfSupplyCity: q.placeOfSupplyCity || "",
        placeOfSupplyState: q.placeOfSupplyState || "",
        placeOfSupplyCountry: q.placeOfSupplyCountry || "India",
        dealOwnerId: q.dealOwnerId || "",
        nextActionDate: q.nextActionDate ? new Date(q.nextActionDate).toISOString().split("T")[0] : "",
        kindAttention: q.kindAttention || "",
      });
      setTaxRate(q.taxRate ? String(q.taxRate) : "");
      setAdditionalDiscount(q.additionalDiscount ? String(q.additionalDiscount) : "");
      setRcmEnabled(q.rcmEnabled || false);
      setRoundOff(q.roundOff || false);
      setAdvanceToPay(q.advanceToPay ? String(q.advanceToPay) : "");
      if (q.items?.length > 0) {
        setItems(q.items.map((item: any) => ({
          itemDescription: item.itemDescription || "",
          materialCode: item.material || "",
          size: item.sizeLabel || "",
          endType: item.ends || "",
          material: item.material || "",
          tagNo: item.tagNo || "",
          drawingRef: item.drawingRef || "",
          itemNo: item.product || "",
          certificateReq: item.certificateReq || "",
          quantity: String(item.quantity),
          unitRate: String(item.unitRate),
          amount: String(item.amount),
          delivery: item.delivery || "",
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

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
    setUseStructuredInput([...useStructuredInput, true]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setUseStructuredInput(useStructuredInput.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NonStdItem, value: string) => {
    setItems((prev) => {
      const newItems = prev.map((item, i) => (i === index ? { ...item } : item));
      newItems[index][field] = value;

      if (field === "quantity" || field === "unitRate") {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const rate = parseFloat(newItems[index].unitRate) || 0;
        newItems[index].amount = (qty * rate).toFixed(2);
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

    // Transform items for API
    const apiItems = items.map((item, i) => {
      const description = useStructuredInput[i]
        ? buildDescription(item)
        : item.itemDescription;
      return {
        product: "Non-Standard Item",
        material: item.material || "",
        additionalSpec: "",
        sizeId: null,
        sizeLabel: item.size || "",
        od: "",
        wt: "",
        length: "",
        ends: item.endType || "",
        quantity: item.quantity,
        unitRate: item.unitRate,
        amount: item.amount,
        delivery: item.delivery,
        remark: item.materialCode || "",
        unitWeight: "",
        totalWeightMT: "",
        tagNo: item.tagNo || "",
        drawingRef: item.drawingRef || "",
        itemDescription: description,
        certificateReq: item.certificateReq || "",
      };
    });

    createMutation.mutate({
      ...formData,
      quotationDate: formData.quotationDate || undefined,
      inquiryNo: formData.inquiryNo || undefined,
      inquiryDate: formData.inquiryDate || undefined,
      dealOwnerId: formData.dealOwnerId || undefined,
      nextActionDate: formData.nextActionDate || undefined,
      kindAttention: formData.kindAttention || undefined,
      taxRate: taxRate || undefined,
      additionalDiscount: additionalDiscount || undefined,
      rcmEnabled,
      roundOff,
      advanceToPay: advanceToPay || undefined,
      items: apiItems,
      terms,
    });
  };

  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalQty = items.reduce((sum, item) => sum + parseFloat(item.quantity || "0"), 0);

  const subtotal = totalAmount;
  const parsedDiscount = parseFloat(additionalDiscount) || 0;
  const discountAmount = parsedDiscount > 0 ? (subtotal * parsedDiscount) / 100 : 0;
  const totalAfterDiscount = subtotal - discountAmount;
  const parsedTaxRate = parseFloat(taxRate) || 0;
  const taxAmount = (!rcmEnabled && parsedTaxRate > 0) ? (totalAfterDiscount * parsedTaxRate) / 100 : 0;
  const grandTotalBeforeRoundOff = totalAfterDiscount + taxAmount;
  const roundOffAmount = roundOff ? (Math.round(grandTotalBeforeRoundOff) - grandTotalBeforeRoundOff) : 0;
  const grandTotal = grandTotalBeforeRoundOff + roundOffAmount;
  const isINR = formData.currency === "INR";
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const curr = formData.currency;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/quotations/create")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Non-Standard Quotation"
          description="Free-text item descriptions for non-standard items"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
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
                    {customersData?.customers?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                    {buyersData?.buyers?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.buyerName}</SelectItem>
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
                    <SelectValue placeholder="Select deal owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No deal owner</SelectItem>
                    {usersData?.users?.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
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
                <Label>Kind Attention</Label>
                <Input
                  value={formData.kindAttention}
                  onChange={(e) =>
                    setFormData({ ...formData, kindAttention: e.target.value.slice(0, 200) })
                  }
                  placeholder="Attention to (max 200 chars)"
                  maxLength={200}
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
                      {[selectedCustomer.addressLine1, selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {selectedBuyer && (
                    <div>
                      <span className="text-muted-foreground">Attn:</span>{" "}
                      {selectedBuyer.buyerName}
                      {selectedBuyer.designation && ` (${selectedBuyer.designation})`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Non-Standard Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Item Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Use structured fields or paste full description
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">Item #{index + 1}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={useStructuredInput[index] ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const newFlags = [...useStructuredInput];
                          newFlags[index] = true;
                          setUseStructuredInput(newFlags);
                        }}
                      >
                        Structured
                      </Button>
                      <Button
                        type="button"
                        variant={!useStructuredInput[index] ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const newFlags = [...useStructuredInput];
                          newFlags[index] = false;
                          // Pre-fill free text from structured fields
                          if (useStructuredInput[index]) {
                            const desc = buildDescription(item);
                            updateItem(index, "itemDescription", desc);
                          }
                          setUseStructuredInput(newFlags);
                        }}
                      >
                        Free Text
                      </Button>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {useStructuredInput[index] ? (
                  <div className="space-y-4">
                    {/* Description row: Material Code + Short Description (2 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-sm">Material Code</Label>
                        <Input
                          value={item.materialCode}
                          onChange={(e) => updateItem(index, "materialCode", e.target.value)}
                          placeholder="e.g., 9715286"
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label className="text-sm">Short Description</Label>
                        <Input
                          value={item.itemDescription}
                          onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                          placeholder="PIPE BE 6&quot; S-40 A106B + NACE"
                        />
                      </div>
                    </div>
                    {/* Specs row: Size, End Type, Material (3 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-sm">Size</Label>
                        <Input
                          value={item.size}
                          onChange={(e) => updateItem(index, "size", e.target.value)}
                          placeholder='6" X SCH-40'
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">End Type</Label>
                        <Input
                          value={item.endType}
                          onChange={(e) => updateItem(index, "endType", e.target.value)}
                          placeholder="BEVELLED ENDS"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Material</Label>
                        <Input
                          value={item.material}
                          onChange={(e) => updateItem(index, "material", e.target.value)}
                          placeholder="A106Gr.B + NACE"
                        />
                      </div>
                    </div>
                    {/* Reference row: Tag, DWG, Item No (3 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-sm">Tag Number</Label>
                        <Input
                          value={item.tagNo}
                          onChange={(e) => updateItem(index, "tagNo", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Drawing Ref (DWG)</Label>
                        <Input
                          value={item.drawingRef}
                          onChange={(e) => updateItem(index, "drawingRef", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Item No.</Label>
                        <Input
                          value={item.itemNo}
                          onChange={(e) => updateItem(index, "itemNo", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm">Certificate Required</Label>
                      <Textarea
                        value={item.certificateReq}
                        onChange={(e) => updateItem(index, "certificateReq", e.target.value)}
                        rows={2}
                        placeholder="NACE MILLS (MANUFACTURERS) TEST CERTIFICATES..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <Label className="text-xs">Full Item Description</Label>
                    <Textarea
                      value={item.itemDescription}
                      onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                      rows={8}
                      placeholder={"MATERIAL CODE: 9715286\nPIPE BE 6\" S-40 A106B + NACE + CLAD N10276\nSIZE: 6\" X SCH-40\nBEVELLED ENDS\nMATERIAL: A106Gr.B + NACE\nTAG NUMBER: ...\nDWG: ...\nITEM NO.: ...\n\nCERTIFICATE REQUIRED: ..."}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                {/* Qty / Rate / Amount / Delivery */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-sm">Qty *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Unit Rate ({formData.currency}) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitRate}
                      onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Amount ({formData.currency})</Label>
                    <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Delivery</Label>
                    <Input
                      value={item.delivery}
                      onChange={(e) => updateItem(index, "delivery", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="flex justify-end gap-8 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Qty</div>
                <div className="text-xl font-bold">{totalQty}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Grand Total</div>
                <div className="text-2xl font-bold">
                  {curr} {fmt(grandTotal)}
                </div>
              </div>
            </div>
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

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: controls */}
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
                        id="rcm-ns"
                        checked={rcmEnabled}
                        onCheckedChange={setRcmEnabled}
                      />
                      <Label htmlFor="rcm-ns" className="cursor-pointer">
                        RCM (Reverse Charge)
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="roundoff-ns"
                      checked={roundOff}
                      onCheckedChange={setRoundOff}
                    />
                    <Label htmlFor="roundoff-ns" className="cursor-pointer">
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

              {/* Right: breakdown */}
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
    </div>
  );
}
