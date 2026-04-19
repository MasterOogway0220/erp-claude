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
import { Plus, Trash2, ArrowLeft, Building2, MapPin, ListChecks, Copy, ChevronDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { FittingSelect } from "@/components/shared/fitting-select";
import { FlangeSelect } from "@/components/shared/flange-select";

type NonStdItemCategory = "Item" | "Fitting" | "Flange";

interface NonStdItem {
  itemCategory: NonStdItemCategory;
  materialCodeId: string;
  materialCodeLabel: string;
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
  uom: string;
  delivery: string;
  remark: string;
  pastQuote: string;
  pastQuotePrice: string;
  pastPo: string;
  pastPoPrice: string;
  fittingId: string;
  fittingLabel: string;
  flangeId: string;
  flangeLabel: string;
}

const GST_RATES = ["0", "5", "12", "18", "28"];

const emptyItem: NonStdItem = {
  itemCategory: "Item",
  materialCodeId: "",
  materialCodeLabel: "",
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
  uom: "Mtr",
  delivery: "8-10 Weeks, Ex-works",
  remark: "",
  pastQuote: "",
  pastQuotePrice: "",
  pastPo: "",
  pastPoPrice: "",
  fittingId: "",
  fittingLabel: "",
  flangeId: "",
  flangeLabel: "",
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
    preparedById: "",
    nextActionDate: "",
    kindAttention: "",
    sourceTenderId: "",
  });
  const [items, setItems] = useState<NonStdItem[]>([emptyItem]);
  const [terms, setTerms] = useState<{
    termName: string;
    termValue: string;
    isIncluded: boolean;
    isCustom: boolean;
    isHeadingEditable: boolean;
  }[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [useStructuredInput, setUseStructuredInput] = useState<boolean[]>([false]);

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

  // Fetch users for Deal Owner dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
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

  const selectedCustomer = customersData?.customers?.find(
    (c: any) => c.id === formData.customerId
  );

  const selectedBuyer = buyersData?.buyers?.find(
    (b: any) => b.id === formData.buyerId
  );

  // Track whether edit data has been loaded — skip auto-currency until loaded
  const editCurrencyLoadedRef = useRef(false);

  // Auto-set currency based on market type (skip in edit mode until data is loaded)
  useEffect(() => {
    if (editId && !editCurrencyLoadedRef.current) return;
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
        preparedById: q.preparedById || "",
        nextActionDate: q.nextActionDate ? new Date(q.nextActionDate).toISOString().split("T")[0] : "",
        kindAttention: q.kindAttention || "",
        sourceTenderId: q.sourceTenderId || "",
      });
      setTaxRate(q.taxRate ? String(q.taxRate) : "");
      setAdditionalDiscount(q.additionalDiscount ? String(q.additionalDiscount) : "");
      setRcmEnabled(q.rcmEnabled || false);
      setRoundOff(q.roundOff || false);
      setAdvanceToPay(q.advanceToPay ? String(q.advanceToPay) : "");
      if (q.items?.length > 0) {
        setItems(q.items.map((item: any) => ({
          itemCategory: item.fittingId ? "Fitting" as NonStdItemCategory : item.flangeId ? "Flange" as NonStdItemCategory : "Item" as NonStdItemCategory,
          materialCodeId: item.materialCodeId || "",
          materialCodeLabel: item.materialCodeLabel || item.materialCode?.code || "",
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
          uom: item.uom || "Mtr",
          delivery: item.delivery || "",
          remark: item.remark || "",
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
      editCurrencyLoadedRef.current = true;
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
              itemDescription: [ti.product, ti.material, ti.additionalSpec, ti.size || ti.sizeLabel]
                .filter(Boolean)
                .join(" "),
              material: ti.material || "",
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
      router.push(`/quotations/${data.id || editId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
    setUseStructuredInput([...useStructuredInput, false]);
  };

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
          if (data.pastQuote.remark && !updated.remark) {
            updated.remark = data.pastQuote.remark;
          }
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
      // Silently fail
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
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setUseStructuredInput(useStructuredInput.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NonStdItem, value: string) => {
    setItems((prev) => {
      const newItems = prev.map((item, i) => (i === index ? { ...item } : item));
      (newItems[index] as any)[field] = value;

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
        materialCodeId: item.materialCodeId || undefined,
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
        uom: item.uom || "Mtr",
        delivery: item.delivery,
        remark: item.remark || "",
        unitWeight: "",
        totalWeightMT: "",
        tagNo: item.tagNo || "",
        drawingRef: item.drawingRef || "",
        itemDescription: description,
        certificateReq: item.certificateReq || "",
        pastQuote: item.pastQuote || "",
        pastQuotePrice: item.pastQuotePrice || "",
        pastPo: item.pastPo || "",
        pastPoPrice: item.pastPoPrice || "",
        fittingId: item.fittingId || "",
        flangeId: item.flangeId || "",
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
    <div className="space-y-6">
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
              <div key={index} className="p-4 border rounded-lg space-y-4 overflow-visible relative" style={{ zIndex: items.length - index }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm">Item #{index + 1}</span>
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {(["Item", "Fitting", "Flange"] as NonStdItemCategory[]).map((cat) => (
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
                    <div className="flex gap-2">
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
                    </div>
                  </div>
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
                                setItems((prev) => {
                                  const newItems = [...prev];
                                  newItems[index] = {
                                    ...newItems[index],
                                    materialCodeId: src.materialCodeId,
                                    materialCodeLabel: src.materialCodeLabel,
                                    materialCode: src.materialCode,
                                    itemDescription: src.itemDescription,
                                    size: src.size,
                                    endType: src.endType,
                                    material: src.material,
                                    quantity: src.quantity,
                                    unitRate: src.unitRate,
                                    uom: src.uom,
                                    delivery: src.delivery,
                                    remark: src.remark,
                                    fittingId: src.fittingId,
                                    fittingLabel: src.fittingLabel,
                                    flangeId: src.flangeId,
                                    flangeLabel: src.flangeLabel,
                                  };
                                  return newItems;
                                });
                                setUseStructuredInput((prev) => {
                                  const newFlags = [...prev];
                                  newFlags[index] = prev[i];
                                  return newFlags;
                                });
                              }}
                            >
                              Item #{i + 1}{src.itemDescription ? ` — ${src.itemDescription.substring(0, 40)}` : src.material ? ` — ${src.material}` : ""}
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

                {useStructuredInput[index] ? (
                  <>
                    {/* Fitting/Flange selector for non-Item categories */}
                    {item.itemCategory === "Fitting" && (
                      <div className="grid gap-2">
                        <Label className="text-sm">Select Fitting *</Label>
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
                              const desc = `${f.type} ${f.size} ${f.schedule || ""} ${f.endType || ""} ${f.materialGrade} ${f.standard || ""}`.replace(/\s+/g, " ").trim();
                              newItems[index] = {
                                ...newItems[index],
                                fittingId: f.id,
                                fittingLabel: desc,
                                itemDescription: desc,
                                material: f.materialGrade,
                                size: f.size,
                                endType: f.endType || "",
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    )}
                    {item.itemCategory === "Flange" && (
                      <div className="grid gap-2">
                        <Label className="text-sm">Select Flange *</Label>
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
                              const desc = `${f.type} ${f.size} ${f.rating}# ${f.facing || ""} ${f.materialGrade} ${f.standard || ""}`.replace(/\s+/g, " ").trim();
                              newItems[index] = {
                                ...newItems[index],
                                flangeId: f.id,
                                flangeLabel: desc,
                                itemDescription: desc,
                                material: f.materialGrade,
                                size: f.size,
                                endType: f.facing || "",
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    )}

                    {/* Row 1: Material Code | Short Description | Size | End Type | Material | Tag Number */}
                    <div className="grid grid-cols-6 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-sm">Material Code</Label>
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
                                    materialCode: mc.code,
                                    ...(mc.productType ? { itemDescription: mc.productType } : {}),
                                    ...(mc.materialGrade ? { material: mc.materialGrade } : {}),
                                    ...(mc.size ? { size: mc.size } : {}),
                                    ...(mc.unit ? { uom: mc.unit } : {}),
                                  };
                                  return newItems;
                                });
                                fetchMaterialHistory(index, mc.id);
                              }}
                              onChange={(text) => {
                                setItems((prev) => {
                                  const newItems = [...prev];
                                  newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "", materialCode: text };
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
                                  newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "", materialCode: text };
                                  return newItems;
                                });
                              }}
                              placeholder={formData.customerId ? "Enter new material code" : "Select customer first"}
                              disabled={!formData.customerId}
                              className="h-8"
                            />
                          )}
                          {item.materialCodeLabel && (item.material || item.itemDescription) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[10px] whitespace-nowrap shrink-0"
                              title="Save to Material Code Master"
                              onClick={async () => {
                                const code = item.materialCodeLabel.trim();
                                if (!code) { toast.error("Material Code is required"); return; }
                                try {
                                  const checkRes = await fetch("/api/masters/material-codes/check-duplicate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      productType: item.itemDescription || item.material || "",
                                      materialGrade: item.material,
                                      size: item.size,
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
                                      newItems[index] = { ...newItems[index], materialCodeId: updated.id, materialCodeLabel: code, materialCode: code };
                                      return newItems;
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["material-codes"] });
                                    toast.success(`Material code updated from "${dup.code}" to "${code}"`);
                                    return;
                                  }
                                  const desc = [item.itemDescription || item.material, item.size, item.endType].filter(Boolean).join(" ");
                                  const createRes = await fetch("/api/masters/material-codes", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      code,
                                      productType: item.itemDescription || item.material || "",
                                      materialGrade: item.material || "",
                                      size: item.size || "",
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
                                    newItems[index] = { ...newItems[index], materialCodeId: created.id, materialCodeLabel: code, materialCode: code };
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
                      <div className="grid gap-2">
                        <Label className="text-sm">Short Description</Label>
                        <Input
                          value={item.itemDescription}
                          onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                          placeholder="PIPE BE 6&quot; S-40 A106B + NACE"
                        />
                      </div>
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
                      <div className="grid gap-2">
                        <Label className="text-sm">Tag Number</Label>
                        <Input
                          value={item.tagNo}
                          onChange={(e) => updateItem(index, "tagNo", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 2: Drawing Ref | Item No | Certificate Req */}
                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="grid gap-2">
                        <Label className="text-sm">Certificate Required</Label>
                        <Input
                          value={item.certificateReq}
                          onChange={(e) => updateItem(index, "certificateReq", e.target.value)}
                          placeholder="NACE MILLS TEST CERTS..."
                        />
                      </div>
                    </div>
                    {/* Row 3: Qty | Unit | Unit Rate | Total | Delivery | Remarks */}
                    <div className="grid grid-cols-6 gap-4">
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
                        <Label className="text-sm">Unit</Label>
                        <Select value={item.uom} onValueChange={(v) => updateItem(index, "uom", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                        <Label className="text-sm">Total Amount ({formData.currency})</Label>
                        <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Delivery</Label>
                        <Input
                          value={item.delivery}
                          onChange={(e) => updateItem(index, "delivery", e.target.value)}
                          placeholder="8-10 Weeks"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Remarks</Label>
                        <Input
                          value={item.remark}
                          onChange={(e) => updateItem(index, "remark", e.target.value)}
                          placeholder="Any remarks"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Free Text mode: Material Code + Description textarea */}
                    <div className="grid gap-2">
                      <Label className="text-sm">Material Code</Label>
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
                                  materialCode: mc.code,
                                  ...(mc.productType ? { itemDescription: mc.productType } : {}),
                                  ...(mc.materialGrade ? { material: mc.materialGrade } : {}),
                                  ...(mc.size ? { size: mc.size } : {}),
                                  ...(mc.unit ? { uom: mc.unit } : {}),
                                };
                                return newItems;
                              });
                              fetchMaterialHistory(index, mc.id);
                            }}
                            onChange={(text) => {
                              setItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "", materialCode: text };
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
                                newItems[index] = { ...newItems[index], materialCodeLabel: text, materialCodeId: "", materialCode: text };
                                return newItems;
                              });
                            }}
                            placeholder={formData.customerId ? "Enter new material code" : "Select customer first"}
                            disabled={!formData.customerId}
                            className="h-8"
                          />
                        )}
                        {item.materialCodeLabel && item.itemDescription && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-[10px] whitespace-nowrap shrink-0"
                            title="Save to Material Code Master"
                            onClick={async () => {
                              const code = item.materialCodeLabel.trim();
                              if (!code) { toast.error("Material Code is required"); return; }
                              try {
                                const checkRes = await fetch("/api/masters/material-codes/check-duplicate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    productType: item.itemDescription,
                                    materialGrade: "",
                                    size: "",
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
                                    newItems[index] = { ...newItems[index], materialCodeId: updated.id, materialCodeLabel: code, materialCode: code };
                                    return newItems;
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["material-codes"] });
                                  toast.success(`Material code updated from "${dup.code}" to "${code}"`);
                                  return;
                                }
                                const createRes = await fetch("/api/masters/material-codes", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    code,
                                    productType: item.itemDescription,
                                    description: item.itemDescription,
                                  }),
                                });
                                if (!createRes.ok) {
                                  const err = await createRes.json().catch(() => ({}));
                                  throw new Error(err.error || "Failed to create material code");
                                }
                                const created = await createRes.json();
                                setItems((prev) => {
                                  const newItems = [...prev];
                                  newItems[index] = { ...newItems[index], materialCodeId: created.id, materialCodeLabel: code, materialCode: code };
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

                    {/* Fitting/Flange selector for non-Item categories */}
                    {item.itemCategory === "Fitting" && (
                      <div className="grid gap-2">
                        <Label className="text-sm">Select Fitting *</Label>
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
                              const desc = `${f.type} ${f.size} ${f.schedule || ""} ${f.endType || ""} ${f.materialGrade} ${f.standard || ""}`.replace(/\s+/g, " ").trim();
                              newItems[index] = {
                                ...newItems[index],
                                fittingId: f.id,
                                fittingLabel: desc,
                                itemDescription: desc,
                                material: f.materialGrade,
                                size: f.size,
                                endType: f.endType || "",
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    )}
                    {item.itemCategory === "Flange" && (
                      <div className="grid gap-2">
                        <Label className="text-sm">Select Flange *</Label>
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
                              const desc = `${f.type} ${f.size} ${f.rating}# ${f.facing || ""} ${f.materialGrade} ${f.standard || ""}`.replace(/\s+/g, " ").trim();
                              newItems[index] = {
                                ...newItems[index],
                                flangeId: f.id,
                                flangeLabel: desc,
                                itemDescription: desc,
                                material: f.materialGrade,
                                size: f.size,
                                endType: f.facing || "",
                              };
                              return newItems;
                            });
                          }}
                        />
                      </div>
                    )}

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

                    {/* Qty / Unit / Rate / Total / Delivery / Remarks */}
                    <div className="grid grid-cols-6 gap-4">
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
                        <Label className="text-sm">Unit</Label>
                        <Select value={item.uom} onValueChange={(v) => updateItem(index, "uom", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                        <Label className="text-sm">Total Amount ({formData.currency})</Label>
                        <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Delivery</Label>
                        <Input
                          value={item.delivery}
                          onChange={(e) => updateItem(index, "delivery", e.target.value)}
                          placeholder="8-10 Weeks"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Remarks</Label>
                        <Input
                          value={item.remark}
                          onChange={(e) => updateItem(index, "remark", e.target.value)}
                          placeholder="Any remarks"
                        />
                      </div>
                    </div>

                    {/* Past Quote / PO */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-sm">Past Quote</Label>
                        <Select
                          value={item.pastQuote || "NONE"}
                          onValueChange={(v) => onPastQuoteSelect(v, index)}
                          disabled={!formData.customerId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select past quote" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">— None —</SelectItem>
                            {pastQuotations.filter((pq: any) => pq.quotationCategory === "NON_STANDARD").map((pq: any) => (
                              <SelectItem key={pq.id} value={pq.quotationNo}>
                                {pq.quotationNo} {pq.contactPerson ? `[${pq.contactPerson}]` : ""} ({pq.quotationDate ? new Date(pq.quotationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Past Quote Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.pastQuotePrice}
                          onChange={(e) => updateItem(index, "pastQuotePrice", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Past PO</Label>
                        <Input
                          value={item.pastPo}
                          onChange={(e) => updateItem(index, "pastPo", e.target.value)}
                          placeholder="PO ref"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Past PO Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.pastPoPrice}
                          onChange={(e) => updateItem(index, "pastPoPrice", e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
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

        {/* Terms & Conditions */}
        {formData.customerId && terms.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTerms((v) => !v)}
                  className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                >
                  <ListChecks className="h-5 w-5" />
                  Terms & Conditions
                  <ChevronDown className={`h-4 w-4 transition-transform ${showTerms ? "rotate-180" : ""}`} />
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({terms.filter((t) => t.isIncluded).length} included)
                  </span>
                </button>
                {showTerms && (
                  <Button type="button" variant="outline" size="sm" onClick={addCustomTerm}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom Term
                  </Button>
                )}
              </div>
            </CardHeader>
            {showTerms && (
            <CardContent>
              <div className="space-y-4">
                {terms.map((term, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Checkbox
                      checked={term.isIncluded}
                      onCheckedChange={() => toggleTermIncluded(index)}
                      className="mt-2.5"
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
            )}
          </Card>
        )}

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
