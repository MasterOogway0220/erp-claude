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
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { PipeSizeSelect } from "@/components/shared/pipe-size-select";
import { Plus, Trash2, ArrowLeft, Calculator } from "lucide-react";
import { toast } from "sonner";

interface QuotationItem {
  product: string;
  material: string;
  additionalSpec: string;
  sizeId: string;
  sizeLabel: string;
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
  // Export quotation fields
  tagNo?: string;
  drawingRef?: string;
  itemDescription?: string;
  certificateReq?: string;
  // BOM quotation fields
  componentPosition?: string;
  itemType?: string; // Tube, Pipe, Plate
  wtType?: string; // MIN, AV
  tubeLength?: string;
  tubeCount?: string;
}

const emptyItem: QuotationItem = {
  product: "",
  material: "",
  additionalSpec: "",
  sizeId: "",
  sizeLabel: "",
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
  // Export fields
  tagNo: "",
  drawingRef: "",
  itemDescription: "",
  certificateReq: "",
  // BOM fields
  componentPosition: "",
  itemType: "Pipe",
  wtType: "MIN",
  tubeLength: "",
  tubeCount: "",
};

// Default quotation terms from PRD
const defaultTerms = [
  { termName: "Price", termValue: "Ex-work, Navi Mumbai, India" },
  { termName: "Delivery", termValue: "As above, ex-works, after receipt of PO" },
  { termName: "Payment", termValue: "100% within 30 Days from date of dispatch" },
  { termName: "Offer Validity", termValue: "6 Days, subject to stock remain unsold" },
  { termName: "Packing", termValue: "Inclusive" },
  { termName: "Freight", termValue: "Extra at actual / To your account" },
  { termName: "Insurance", termValue: "Extra at actual / To your account" },
  { termName: "Certification", termValue: "EN 10204 3.1" },
  { termName: "T/T Charges", termValue: "To your account, Full Invoice amount to be remitted" },
  { termName: "Third Party Inspection", termValue: "If any required, all charges Extra At Actual" },
  { termName: "Testing Charges", termValue: "If any required, all charges Extra At Actual" },
  { termName: "Material Origin", termValue: "India/Canada" },
  { termName: "Qty. Tolerance", termValue: "-0 / +1 Random Length" },
  { termName: "Dimension Tolerance", termValue: "As per manufacture" },
  { termName: "Part Orders", termValue: "Subject reconfirm with N-PIPE" },
];

// Export quotation notes from PRD Appendix C
const exportNotes = [
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

export default function CreateQuotationPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <CreateQuotationPage />
    </Suspense>
  );
}

function CreateQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enquiryId = searchParams.get("enquiryId");

  const [formData, setFormData] = useState({
    customerId: "",
    enquiryId: enquiryId || "",
    quotationType: "DOMESTIC",
    currency: "INR",
    validUpto: "",
  });
  const [items, setItems] = useState<QuotationItem[]>([emptyItem]);
  const [terms, setTerms] = useState(defaultTerms);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
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

  // Pre-fill from enquiry
  useEffect(() => {
    if (enquiryData?.enquiry) {
      const enq = enquiryData.enquiry;
      setFormData((prev) => ({
        ...prev,
        customerId: enq.customerId,
      }));

      // Pre-fill items from enquiry
      if (enq.items && enq.items.length > 0) {
        const enquiryItems = enq.items.map((item: any) => ({
          ...emptyItem,
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.size || "",
          ends: item.ends || "BE",
          quantity: item.quantity?.toString() || "",
          remark: item.remarks || "",
        }));
        setItems(enquiryItems);
      }
    }
  }, [enquiryData]);

  // Auto-set currency for export quotations
  useEffect(() => {
    if (formData.quotationType === "EXPORT" && formData.currency === "INR") {
      setFormData((prev) => ({ ...prev, currency: "USD" }));
    }
  }, [formData.quotationType]);

  // Create quotation mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create quotation");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Quotation ${data.quotationNo} created successfully`);
      router.push(`/quotations/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to create quotation");
    },
  });

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-calculate when quantity or unit rate changes
    if (field === "quantity" || field === "unitRate") {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].unitRate) || 0;
      newItems[index].amount = (qty * rate).toFixed(2);

      // Calculate total weight if unit weight is available
      if (newItems[index].unitWeight) {
        const unitWeight = parseFloat(newItems[index].unitWeight);
        newItems[index].totalWeightMT = ((qty * unitWeight) / 1000).toFixed(4);
      }
    }

    setItems(newItems);
  };

  const updateTerm = (index: number, field: "termName" | "termValue", value: string) => {
    const newTerms = [...terms];
    newTerms[index][field] = value;
    setTerms(newTerms);
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

    createMutation.mutate({ ...formData, items, terms });
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.totalWeightMT || "0"), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Create Quotation"
          description={enquiryId ? `From Enquiry` : "New quotation"}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerId: value })
                  }
                  required
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
                <Label htmlFor="quotationType">Quotation Type</Label>
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
                    <SelectItem value="DOMESTIC">Domestic / Standard</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                    <SelectItem value="BOM">BOM / Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
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
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="validUpto">Valid Until</Label>
              <Input
                id="validUpto"
                type="date"
                value={formData.validUpto}
                onChange={(e) =>
                  setFormData({ ...formData, validUpto: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quotation Items</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select size to auto-fill OD, WT, Weight • Amount auto-calculates
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <ProductMaterialSelect
                  product={item.product}
                  material={item.material}
                  onProductChange={(val) => updateItem(index, "product", val)}
                  onMaterialChange={(val) => updateItem(index, "material", val)}
                  onAutoFill={(fields) => {
                    if (fields.additionalSpec) updateItem(index, "additionalSpec", fields.additionalSpec);
                    if (fields.ends) updateItem(index, "ends", fields.ends);
                    if (fields.length) updateItem(index, "length", fields.length);
                  }}
                />

                <div className="grid gap-2">
                  <Label>Size (Auto-fills OD/WT/Weight) *</Label>
                  <PipeSizeSelect
                    value={item.sizeLabel}
                    onChange={(text) => updateItem(index, "sizeLabel", text)}
                    onSelect={(size) => {
                      const newItems = [...items];
                      newItems[index].sizeId = size.id;
                      newItems[index].sizeLabel = size.sizeLabel;
                      newItems[index].od = size.od.toString();
                      newItems[index].wt = size.wt.toString();
                      newItems[index].unitWeight = size.weight.toString();
                      if (newItems[index].quantity) {
                        const qty = parseFloat(newItems[index].quantity);
                        newItems[index].totalWeightMT = ((qty * size.weight) / 1000).toFixed(4);
                      }
                      setItems(newItems);
                    }}
                    label="Size"
                    placeholder="Search pipe size..."
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label>OD (mm)</Label>
                    <Input value={item.od} readOnly className="bg-muted" />
                  </div>
                  <div className="grid gap-2">
                    <Label>WT (mm)</Label>
                    <Input value={item.wt} readOnly className="bg-muted" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit Weight (kg/m)</Label>
                    <Input value={item.unitWeight} readOnly className="bg-muted" />
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

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="grid gap-2">
                    <Label>Length</Label>
                    <Input
                      value={item.length}
                      onChange={(e) => updateItem(index, "length", e.target.value)}
                      placeholder="5-7 Mtr"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantity (Mtr) *</Label>
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
                    <Input
                      value={item.amount}
                      readOnly
                      className="bg-muted font-semibold"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Weight (MT)</Label>
                    <Input
                      value={item.totalWeightMT}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Delivery</Label>
                    <Input
                      value={item.delivery}
                      onChange={(e) => updateItem(index, "delivery", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Additional Spec</Label>
                    <Input
                      value={item.additionalSpec}
                      onChange={(e) => updateItem(index, "additionalSpec", e.target.value)}
                      placeholder="NACE MR0175, HIC"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Remark</Label>
                  <Input
                    value={item.remark}
                    onChange={(e) => updateItem(index, "remark", e.target.value)}
                  />
                </div>

                {/* Export Quotation Specific Fields */}
                {formData.quotationType === "EXPORT" && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
                      <div className="grid gap-2">
                        <Label>Tag Number</Label>
                        <Input
                          value={item.tagNo || ""}
                          onChange={(e) => updateItem(index, "tagNo", e.target.value)}
                          placeholder="Tag No."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Drawing Reference</Label>
                        <Input
                          value={item.drawingRef || ""}
                          onChange={(e) => updateItem(index, "drawingRef", e.target.value)}
                          placeholder="Dwg. Ref."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Certificate Requirements</Label>
                        <Input
                          value={item.certificateReq || ""}
                          onChange={(e) => updateItem(index, "certificateReq", e.target.value)}
                          placeholder="EN 10204 3.1, etc."
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Item Description (Multi-line for export format)</Label>
                      <Textarea
                        value={item.itemDescription || ""}
                        onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                        placeholder="Full item description with Material Code, Size, End Type, Material, Tag No., Drawing Ref..."
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {/* BOM Quotation Specific Fields */}
                {formData.quotationType === "BOM" && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t">
                      <div className="grid gap-2">
                        <Label>Component Position</Label>
                        <Input
                          value={item.componentPosition || ""}
                          onChange={(e) => updateItem(index, "componentPosition", e.target.value)}
                          placeholder="Position No."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Drawing Reference</Label>
                        <Input
                          value={item.drawingRef || ""}
                          onChange={(e) => updateItem(index, "drawingRef", e.target.value)}
                          placeholder="Dwg. Ref."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Item Type</Label>
                        <Select
                          value={item.itemType || "Pipe"}
                          onValueChange={(value) => updateItem(index, "itemType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pipe">Pipe</SelectItem>
                            <SelectItem value="Tube">Tube</SelectItem>
                            <SelectItem value="Plate">Plate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>WT Type</Label>
                        <Select
                          value={item.wtType || "MIN"}
                          onValueChange={(value) => updateItem(index, "wtType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MIN">MIN (Minimum)</SelectItem>
                            <SelectItem value="AV">AV (Average)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Tag Number</Label>
                        <Input
                          value={item.tagNo || ""}
                          onChange={(e) => updateItem(index, "tagNo", e.target.value)}
                          placeholder="Tag No."
                        />
                      </div>
                    </div>
                    {(item.itemType === "Tube" || item.itemType === "tube") && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Tube Length (individual)</Label>
                          <Input
                            value={item.tubeLength || ""}
                            onChange={(e) => updateItem(index, "tubeLength", e.target.value)}
                            placeholder="e.g., 6.0 Mtr"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tube Count</Label>
                          <Input
                            type="number"
                            value={item.tubeCount || ""}
                            onChange={(e) => updateItem(index, "tubeCount", e.target.value)}
                            placeholder="Number of tubes"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Totals */}
            <div className="flex justify-end gap-8 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">
                  {formData.currency} {totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Weight</div>
                <div className="text-2xl font-bold">
                  {totalWeight.toFixed(4)} MT
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Offer Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {terms.map((term, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Input
                    value={term.termName}
                    onChange={(e) => updateTerm(index, "termName", e.target.value)}
                    placeholder="Term name"
                  />
                </div>
                <div className="md:col-span-3 grid gap-2">
                  <Textarea
                    value={term.termValue}
                    onChange={(e) => updateTerm(index, "termValue", e.target.value)}
                    rows={1}
                    placeholder="Term value"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Quotation Notes (PRD Appendix C) */}
        {formData.quotationType === "EXPORT" && (
          <Card>
            <CardHeader>
              <CardTitle>Export Quotation Notes (Standard)</CardTitle>
              <p className="text-sm text-muted-foreground">
                These 9 standard notes will appear on the export quotation PDF
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {exportNotes.map((note, index) => (
                  <li key={index}>
                    <span className="font-semibold">{index + 1}.</span> {note}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
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
