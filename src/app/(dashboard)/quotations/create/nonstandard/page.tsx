"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Building2, History, ChevronDown, ChevronUp } from "lucide-react";
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
  const enquiryId = searchParams.get("enquiryId");
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    enquiryId: enquiryId || "",
    quotationType: "DOMESTIC",
    quotationCategory: "NON_STANDARD",
    currency: "USD",
    validUpto: "",
  });
  const [items, setItems] = useState<NonStdItem[]>([emptyItem]);
  const [terms, setTerms] = useState<{
    termName: string;
    termValue: string;
    isIncluded: boolean;
    isCustom: boolean;
    isHeadingEditable: boolean;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [useStructuredInput, setUseStructuredInput] = useState<boolean[]>([true]);

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

  // Fetch offer term templates
  const { data: templatesData } = useQuery({
    queryKey: ["offer-term-templates"],
    queryFn: async () => {
      const res = await fetch("/api/offer-term-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
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

  const selectedCustomer = customersData?.customers?.find(
    (c: any) => c.id === formData.customerId
  );

  const selectedBuyer = buyersData?.buyers?.find(
    (b: any) => b.id === formData.buyerId
  );

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
        enquiryId: q.enquiryId || "",
        quotationType: q.quotationType || "DOMESTIC",
        quotationCategory: q.quotationCategory || "NON_STANDARD",
        currency: q.currency || "USD",
        validUpto: q.validUpto ? new Date(q.validUpto).toISOString().split("T")[0] : "",
      });
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
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "quantity" || field === "unitRate") {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].unitRate) || 0;
      newItems[index].amount = (qty * rate).toFixed(2);
    }

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
      items: apiItems,
      terms,
    });
  };

  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalQty = items.reduce((sum, item) => sum + parseFloat(item.quantity || "0"), 0);

  return (
    <div className="space-y-6 max-w-6xl">
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, buyerId: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No buyer selected</SelectItem>
                    {buyersData?.buyers?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.buyerName}</SelectItem>
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
                      History
                      {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  )}
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
                  {selectedCustomer.gstNo && (
                    <div><span className="text-muted-foreground">GST:</span> {selectedCustomer.gstNo}</div>
                  )}
                </div>
              </div>
            )}

            {/* History Panel */}
            {showHistory && historyData?.quotations?.length > 0 && (
              <div className="rounded-lg border p-4 max-h-48 overflow-y-auto">
                <h4 className="text-sm font-medium mb-2">Previous Quotations</h4>
                {historyData.quotations.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between text-sm border-b pb-2 mb-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs">{q.quotationNo}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(q.quotationDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <Badge variant={q.status === "WON" ? "default" : "secondary"} className="text-xs">
                      {q.status}
                    </Badge>
                  </div>
                ))}
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Material Code</Label>
                        <Input
                          value={item.materialCode}
                          onChange={(e) => updateItem(index, "materialCode", e.target.value)}
                          placeholder="e.g., 9715286"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Short Description</Label>
                        <Input
                          value={item.itemDescription}
                          onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                          placeholder="PIPE BE 6&quot; S-40 A106B + NACE"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Size</Label>
                        <Input
                          value={item.size}
                          onChange={(e) => updateItem(index, "size", e.target.value)}
                          placeholder='6" X SCH-40'
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">End Type</Label>
                        <Input
                          value={item.endType}
                          onChange={(e) => updateItem(index, "endType", e.target.value)}
                          placeholder="BEVELLED ENDS"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Material</Label>
                        <Input
                          value={item.material}
                          onChange={(e) => updateItem(index, "material", e.target.value)}
                          placeholder="A106Gr.B + NACE"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Tag Number</Label>
                        <Input
                          value={item.tagNo}
                          onChange={(e) => updateItem(index, "tagNo", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Drawing Ref (DWG)</Label>
                        <Input
                          value={item.drawingRef}
                          onChange={(e) => updateItem(index, "drawingRef", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Item No.</Label>
                        <Input
                          value={item.itemNo}
                          onChange={(e) => updateItem(index, "itemNo", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Certificate Required</Label>
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
                <div className="grid grid-cols-4 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Qty *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Unit Rate ({formData.currency}) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitRate}
                      onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Amount ({formData.currency})</Label>
                    <Input value={item.amount} readOnly className="bg-muted font-semibold" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Delivery</Label>
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
                  {formData.currency} {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
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
                Check/uncheck to include on PDF
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
              These 9 standard notes appear on every quotation PDF
            </p>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {hardCodedNotes.map((note, i) => (
                <li key={i}>
                  <span className="font-semibold">{i + 1})</span> {note}
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
