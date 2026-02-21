"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Building2, History, ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  // Internal costing fields
  materialCost: string;
  logisticsCost: string;
  inspectionCost: string;
  otherCosts: string;
  totalCostPerUnit: string;
  marginPercentage: string;
  costingExpanded: boolean;
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
  totalWeightMT: "0.0000",
  // Internal costing fields
  materialCost: "",
  logisticsCost: "",
  inspectionCost: "",
  otherCosts: "",
  totalCostPerUnit: "",
  marginPercentage: "",
  costingExpanded: false,
};

const hardCodedNotes = [
  "Prices are subject to review if items are deleted or if quantities are changed.",
  "This quotation is subject to confirmation at the time of order placement.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rate.",
  "Shipping date will be calculated based on the number of business days after receipt of the techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as possible to the requested quantity in the fixed lengths indicated.",
  "Once an order is placed, it cannot be cancelled under any circumstances.",
  "The quoted specification complies with the standard practice of the specification, without supplementary requirements (unless otherwise specifically stated in the offer).",
  "Reduction in quantity after placement of order will not be accepted. Any increase in quantity will be subject to our acceptance.",
  "In case of any changes in Government duties, taxes, or policies, the rates are liable to revision.",
];

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
  const enquiryId = searchParams.get("enquiryId");
  const editId = searchParams.get("editId");
  const { user } = useCurrentUser();

  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    enquiryId: enquiryId || "",
    quotationType: "DOMESTIC",
    quotationCategory: "STANDARD",
    currency: "INR",
    validUpto: "",
    paymentTermsId: "",
    deliveryTermsId: "",
    deliveryPeriod: "",
  });
  const [items, setItems] = useState<QuotationItem[]>([emptyItem]);
  const [terms, setTerms] = useState<{
    termName: string;
    termValue: string;
    isIncluded: boolean;
    isCustom: boolean;
    isHeadingEditable: boolean;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  // Fetch pipe sizes for NPS/Schedule dropdowns
  const { data: pipeSizesData } = useQuery({
    queryKey: ["pipe-sizes"],
    queryFn: async () => {
      const res = await fetch("/api/masters/pipe-sizes");
      if (!res.ok) throw new Error("Failed to fetch pipe sizes");
      return res.json();
    },
  });

  // Fetch enquiry if linked
  const { data: enquiryData } = useQuery({
    queryKey: ["enquiry", enquiryId],
    enabled: !!enquiryId,
    queryFn: async () => {
      const res = await fetch(`/api/enquiries/${enquiryId}`);
      if (!res.ok) throw new Error("Failed to fetch enquiry");
      return res.json();
    },
  });

  // Fetch offer term templates
  const { data: templatesData } = useQuery({
    queryKey: ["offer-term-templates"],
    queryFn: async () => {
      const res = await fetch("/api/offer-term-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  // Fetch payment terms master
  const { data: paymentTermsData } = useQuery({
    queryKey: ["payment-terms"],
    queryFn: async () => {
      const res = await fetch("/api/masters/payment-terms");
      if (!res.ok) throw new Error("Failed to fetch payment terms");
      return res.json();
    },
  });

  // Fetch delivery terms master
  const { data: deliveryTermsData } = useQuery({
    queryKey: ["delivery-terms"],
    queryFn: async () => {
      const res = await fetch("/api/masters/delivery-terms");
      if (!res.ok) throw new Error("Failed to fetch delivery terms");
      return res.json();
    },
  });

  // Fetch quotation history for selected customer
  const { data: historyData } = useQuery({
    queryKey: ["quotation-history", formData.customerId],
    enabled: !!formData.customerId,
    queryFn: async () => {
      const res = await fetch(`/api/masters/customers/${formData.customerId}/quotation-history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  // Derive NPS and Schedule options from pipe sizes
  const { npsOptions, getSchedulesForNps, findPipeSize } = useMemo(() => {
    const sizes = pipeSizesData?.pipeSizes || [];
    const npsSet = new Map<string, number>();
    sizes.forEach((s: any) => {
      if (s.nps !== null && s.nps !== undefined) {
        const npsVal = parseFloat(s.nps);
        const npsStr = npsVal.toString();
        if (!npsSet.has(npsStr)) npsSet.set(npsStr, npsVal);
      }
    });
    const npsOpts = Array.from(npsSet.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([str]) => str);

    const getSchedulesForNps = (nps: string): string[] => {
      const schedules = new Set<string>();
      sizes.forEach((s: any) => {
        if (s.nps !== null && parseFloat(s.nps).toString() === nps && s.schedule) {
          schedules.add(s.schedule);
        }
      });
      return Array.from(schedules).sort();
    };

    const findPipeSize = (nps: string, schedule: string) => {
      return sizes.find(
        (s: any) =>
          s.nps !== null &&
          parseFloat(s.nps).toString() === nps &&
          s.schedule === schedule
      );
    };

    return { npsOptions: npsOpts, getSchedulesForNps, findPipeSize };
  }, [pipeSizesData]);

  const selectedCustomer = customersData?.customers?.find(
    (c: any) => c.id === formData.customerId
  );

  const selectedBuyer = buyersData?.buyers?.find(
    (b: any) => b.id === formData.buyerId
  );

  // Pre-fill from enquiry
  useEffect(() => {
    if (enquiryData?.enquiry) {
      const enq = enquiryData.enquiry;
      setFormData((prev) => ({
        ...prev,
        customerId: enq.customerId,
        buyerId: enq.buyerId || "",
      }));
      if (enq.items?.length > 0) {
        setItems(
          enq.items.map((item: any) => ({
            ...emptyItem,
            product: item.product || "",
            material: item.material || "",
            additionalSpec: item.additionalSpec || "",
            sizeLabel: item.size || "",
            ends: item.ends || "BE",
            quantity: item.quantity?.toString() || "",
            remark: item.remarks || "",
          }))
        );
      }
    }
  }, [enquiryData]);

  // Auto-set currency for export
  useEffect(() => {
    if (formData.quotationType === "EXPORT" && formData.currency === "INR") {
      setFormData((prev) => ({ ...prev, currency: "USD" }));
    }
  }, [formData.quotationType]);

  // Auto-set currency from customer
  useEffect(() => {
    if (selectedCustomer?.defaultCurrency) {
      setFormData((prev) => ({ ...prev, currency: selectedCustomer.defaultCurrency }));
    }
  }, [selectedCustomer?.defaultCurrency]);

  // Reset buyer when customer changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, buyerId: "" }));
  }, [formData.customerId]);

  // Set terms from templates
  useEffect(() => {
    if (templatesData?.templates) {
      const filtered = templatesData.templates.filter((t: any) =>
        formData.quotationType === "EXPORT" ? true : !t.isExportOnly
      );
      setTerms(
        filtered.map((t: any) => ({
          termName: t.termName,
          termValue: t.termDefaultValue || "",
          isIncluded: true,
          isCustom: false,
          isHeadingEditable: false,
        }))
      );
    }
  }, [templatesData, formData.quotationType]);

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
        enquiryId: q.enquiryId || "",
        quotationType: q.quotationType || "DOMESTIC",
        quotationCategory: q.quotationCategory || "STANDARD",
        currency: q.currency || "INR",
        validUpto: q.validUpto ? new Date(q.validUpto).toISOString().split("T")[0] : "",
        paymentTermsId: q.paymentTermsId || "",
        deliveryTermsId: q.deliveryTermsId || "",
        deliveryPeriod: q.deliveryPeriod || "",
      });
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
          materialCodeId: item.materialCodeId || "",
          uom: item.uom || "",
          hsnCode: item.hsnCode || "",
          taxRate: item.taxRate ? String(item.taxRate) : "",
          unitWeight: item.unitWeight ? String(item.unitWeight) : "",
          totalWeightMT: item.totalWeightMT ? String(item.totalWeightMT) : "",
          materialCost: item.materialCost ? String(item.materialCost) : "",
          logisticsCost: item.logisticsCost ? String(item.logisticsCost) : "",
          inspectionCost: item.inspectionCost ? String(item.inspectionCost) : "",
          otherCosts: item.otherCosts ? String(item.otherCosts) : "",
          totalCostPerUnit: item.totalCostPerUnit ? String(item.totalCostPerUnit) : "",
          marginPercentage: item.marginPercentage ? String(item.marginPercentage) : "",
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

  // Helper to recalculate costing-derived fields for an item
  const recalcCosting = (item: QuotationItem) => {
    const matCost = parseFloat(item.materialCost) || 0;
    const logCost = parseFloat(item.logisticsCost) || 0;
    const inspCost = parseFloat(item.inspectionCost) || 0;
    const othCost = parseFloat(item.otherCosts) || 0;
    const totalCost = matCost + logCost + inspCost + othCost;
    const margin = parseFloat(item.marginPercentage) || 0;

    item.totalCostPerUnit = totalCost > 0 ? totalCost.toFixed(2) : "";

    // Only auto-fill unitRate if any costing field is filled
    if (totalCost > 0) {
      const sellingPrice = totalCost * (1 + margin / 100);
      item.unitRate = sellingPrice.toFixed(2);
    }

    // Recalculate amount
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unitRate) || 0;
    item.amount = (qty * rate).toFixed(2);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    const costingFields: (keyof QuotationItem)[] = [
      "materialCost",
      "logisticsCost",
      "inspectionCost",
      "otherCosts",
      "marginPercentage",
    ];

    if (costingFields.includes(field)) {
      // Costing field changed - recalculate totalCostPerUnit, unitRate, amount
      recalcCosting(newItems[index]);
    } else if (field === "quantity" || field === "unitRate") {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].unitRate) || 0;
      newItems[index].amount = (qty * rate).toFixed(2);
      if (newItems[index].unitWeight) {
        newItems[index].totalWeightMT = ((qty * parseFloat(newItems[index].unitWeight)) / 1000).toFixed(4);
      }
      // If unitRate is manually changed and costing fields exist, back-calculate margin
      if (field === "unitRate") {
        const totalCost = parseFloat(newItems[index].totalCostPerUnit) || 0;
        if (totalCost > 0) {
          const newMargin = ((rate / totalCost - 1) * 100);
          newItems[index].marginPercentage = newMargin >= 0 ? newMargin.toFixed(2) : newMargin.toFixed(2);
        }
      }
    }

    // When NPS or Schedule changes, auto-fill OD, WT, Weight
    if (field === "nps" || field === "schedule") {
      const nps = field === "nps" ? value : newItems[index].nps;
      const sch = field === "schedule" ? value : newItems[index].schedule;
      if (nps && sch) {
        const pipeSize = findPipeSize(nps, sch);
        if (pipeSize) {
          newItems[index].sizeId = pipeSize.id;
          newItems[index].sizeLabel = pipeSize.sizeLabel;
          newItems[index].od = parseFloat(pipeSize.od).toString();
          newItems[index].wt = parseFloat(pipeSize.wt).toString();
          newItems[index].unitWeight = parseFloat(pipeSize.weight).toString();
          if (newItems[index].quantity) {
            const qty = parseFloat(newItems[index].quantity);
            newItems[index].totalWeightMT = ((qty * parseFloat(pipeSize.weight)) / 1000).toFixed(4);
          }
        }
      }
      // Reset schedule options when NPS changes
      if (field === "nps") {
        newItems[index].schedule = "";
        newItems[index].od = "";
        newItems[index].wt = "";
        newItems[index].unitWeight = "";
      }
    }

    setItems(newItems);
  };

  const toggleCosting = (index: number) => {
    const newItems = [...items];
    newItems[index].costingExpanded = !newItems[index].costingExpanded;
    setItems(newItems);
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
    // Strip UI-only fields before sending to API
    const apiItems = items.map(({ costingExpanded, ...item }) => item);
    createMutation.mutate({
      ...formData,
      items: apiItems,
      terms,
    });
  };

  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.totalWeightMT || "0"), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/quotations/create")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Standard Quotation"
          description={enquiryId ? "From Enquiry" : "Pipes, Fittings, Flanges from masters"}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, buyerId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
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
              </div>

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
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formData.validUpto}
                  onChange={(e) =>
                    setFormData({ ...formData, validUpto: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Payment Terms</Label>
                <Select
                  value={formData.paymentTermsId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentTermsId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select payment terms</SelectItem>
                    {(paymentTermsData?.paymentTerms || paymentTermsData?.data || []).map((pt: any) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name || pt.termName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Delivery Terms</Label>
                <Select
                  value={formData.deliveryTermsId || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, deliveryTermsId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select delivery terms</SelectItem>
                    {(deliveryTermsData?.deliveryTerms || deliveryTermsData?.data || []).map((dt: any) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name || dt.termName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Delivery Period</Label>
                <Input
                  value={formData.deliveryPeriod}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryPeriod: e.target.value })
                  }
                  placeholder="e.g., 4-6 weeks from PO receipt"
                />
              </div>
            </div>

            {/* Customer + Buyer Info */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Customer Details</span>
                  {formData.customerId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 text-xs"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="h-3 w-3 mr-1" />
                      Quotation History
                      {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  )}
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
                  {selectedCustomer.gstNo && (
                    <div>
                      <span className="text-muted-foreground">GST:</span> {selectedCustomer.gstNo}
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
                  {selectedCustomer.paymentTerms && (
                    <div>
                      <span className="text-muted-foreground">Payment Terms:</span> {selectedCustomer.paymentTerms}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quotation History Panel */}
            {showHistory && historyData?.quotations?.length > 0 && (
              <div className="rounded-lg border p-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium mb-3">Previous Quotations for this Customer</h4>
                <div className="space-y-2">
                  {historyData.quotations.map((q: any) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs">{q.quotationNo}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(q.quotationDate).toLocaleDateString("en-IN")}
                        </span>
                        {q.buyer?.buyerName && (
                          <Badge variant="outline" className="text-xs">
                            {q.buyer.buyerName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={q.status === "WON" ? "default" : q.status === "LOST" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {q.status}
                        </Badge>
                        <span className="font-medium text-xs">
                          {q.currency || "INR"} {q.totalValue?.toLocaleString("en-IN") || "0"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items with NPS + Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quotation Items</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select NPS + Schedule to auto-fill OD, WT, Weight
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
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

                {/* NPS + Schedule + OD + WT row */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="grid gap-2">
                    <Label>Size (NPS) *</Label>
                    <Select
                      value={item.nps || "NONE"}
                      onValueChange={(v) => updateItem(index, "nps", v === "NONE" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="NPS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Select NPS</SelectItem>
                        {npsOptions.map((nps) => (
                          <SelectItem key={nps} value={nps}>
                            {nps}&quot;
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Schedule *</Label>
                    <Select
                      value={item.schedule || "NONE"}
                      onValueChange={(v) => updateItem(index, "schedule", v === "NONE" ? "" : v)}
                      disabled={!item.nps}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Select Schedule</SelectItem>
                        {item.nps &&
                          getSchedulesForNps(item.nps).map((sch) => (
                            <SelectItem key={sch} value={sch}>
                              {sch}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>OD (mm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.od}
                      onChange={(e) => updateItem(index, "od", e.target.value)}
                      placeholder="Auto or manual"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>WT (mm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.wt}
                      onChange={(e) => updateItem(index, "wt", e.target.value)}
                      placeholder="Auto or manual"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit Wt (kg/m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitWeight}
                      onChange={(e) => updateItem(index, "unitWeight", e.target.value)}
                      placeholder="Auto or manual"
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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="grid gap-2">
                    <Label>Length</Label>
                    <Input
                      value={item.length}
                      onChange={(e) => updateItem(index, "length", e.target.value)}
                      placeholder="9.00-11.8"
                    />
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
                    <Label>Unit Rate ({formData.currency}) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitRate}
                      onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Amount ({formData.currency})</Label>
                    <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Delivery</Label>
                    <Input
                      value={item.delivery}
                      onChange={(e) => updateItem(index, "delivery", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Weight (MT)</Label>
                    <Input value={item.totalWeightMT} readOnly className="bg-muted" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Remark / Material Code</Label>
                  <Input
                    value={item.remark}
                    onChange={(e) => updateItem(index, "remark", e.target.value)}
                  />
                </div>

                {/* Internal Costing Section (Collapsible) - MANAGEMENT/ADMIN only */}
                {(user?.role === "MANAGEMENT" || user?.role === "ADMIN") && (
                <div className="border-t pt-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => toggleCosting(index)}
                  >
                    <Calculator className="h-3 w-3" />
                    Internal Costing
                    {item.costingExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {item.totalCostPerUnit && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Cost: {item.totalCostPerUnit} | Margin: {item.marginPercentage || "0"}%
                      </Badge>
                    )}
                  </Button>

                  {item.costingExpanded && (
                    <div className="mt-3 p-3 rounded-md bg-muted/30 border border-dashed">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-xs">Material Cost/Unit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.materialCost}
                            onChange={(e) =>
                              updateItem(index, "materialCost", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Logistics Cost/Unit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.logisticsCost}
                            onChange={(e) =>
                              updateItem(index, "logisticsCost", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Inspection Cost/Unit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.inspectionCost}
                            onChange={(e) =>
                              updateItem(index, "inspectionCost", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Other Costs/Unit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.otherCosts}
                            onChange={(e) =>
                              updateItem(index, "otherCosts", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Total Cost/Unit</Label>
                          <Input
                            value={item.totalCostPerUnit}
                            readOnly
                            className="bg-muted font-semibold"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Margin %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.marginPercentage}
                            onChange={(e) =>
                              updateItem(index, "marginPercentage", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {item.totalCostPerUnit && (
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>
                            Selling Price = {item.totalCostPerUnit} x (1 + {item.marginPercentage || "0"}%) ={" "}
                            <span className="font-semibold text-foreground">{item.unitRate || "0.00"}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            ))}

            {/* Totals */}
            <div className="flex justify-end gap-8 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">
                  {formData.currency} {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Weight</div>
                <div className="text-2xl font-bold">{totalWeight.toFixed(4)} MT</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offer Terms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Offer Terms & Conditions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Check/uncheck to include on PDF. Edit values as needed.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomTerm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Offer Term
            </Button>
          </CardHeader>
          <CardContent>
            {terms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No terms loaded.</p>
            ) : (
              <div className="space-y-1">
                {terms.map((term, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 py-2 px-2 rounded-md ${
                      !term.isIncluded ? "opacity-50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={term.isIncluded}
                      onCheckedChange={() => toggleTermIncluded(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 items-start">
                      {term.isHeadingEditable ? (
                        <Input
                          value={term.termName}
                          onChange={(e) => updateTermName(index, e.target.value)}
                          placeholder="Term name"
                          className="h-8 text-sm font-medium"
                        />
                      ) : (
                        <span className="font-medium text-sm pt-1">{term.termName}</span>
                      )}
                      <Input
                        value={term.termValue}
                        onChange={(e) => updateTermValue(index, e.target.value)}
                        placeholder="Term value"
                        className="h-8 text-sm"
                      />
                    </div>
                    {term.isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeCustomTerm(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Notes</CardTitle>
            <p className="text-sm text-muted-foreground">
              These 9 standard notes appear on every quotation PDF (not editable)
            </p>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {hardCodedNotes.map((note, index) => (
                <li key={index}>
                  <span className="font-semibold">{index + 1})</span> {note}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/quotations/create")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Quotation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
