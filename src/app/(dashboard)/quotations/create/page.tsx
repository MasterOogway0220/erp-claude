"use client";

import { useState, useEffect } from "react";
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

export default function CreateQuotationPage() {
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

  // Fetch pipe sizes
  const { data: pipeSizesData } = useQuery({
    queryKey: ["pipeSizes"],
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

  // Handle size selection - auto-fill OD, WT, Weight
  const handleSizeSelect = (index: number, sizeId: string) => {
    const selectedSize = pipeSizesData?.pipeSizes?.find((s: any) => s.id === sizeId);
    if (selectedSize) {
      const newItems = [...items];
      newItems[index].sizeId = selectedSize.id;
      newItems[index].sizeLabel = selectedSize.sizeLabel;
      newItems[index].od = selectedSize.od.toString();
      newItems[index].wt = selectedSize.wt.toString();
      newItems[index].unitWeight = selectedSize.weight.toString();

      // Recalculate total weight if quantity exists
      if (newItems[index].quantity) {
        const qty = parseFloat(newItems[index].quantity);
        newItems[index].totalWeightMT = ((qty * selectedSize.weight) / 1000).toFixed(4);
      }

      setItems(newItems);
      toast.success("Size data auto-filled", { duration: 1500 });
    }
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
            <div className="grid grid-cols-3 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Product</Label>
                    <Input
                      value={item.product}
                      onChange={(e) => updateItem(index, "product", e.target.value)}
                      placeholder="e.g., C.S. SEAMLESS PIPE"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Material</Label>
                    <Input
                      value={item.material}
                      onChange={(e) => updateItem(index, "material", e.target.value)}
                      placeholder="e.g., ASTM A106 GR. B"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Size (Auto-fills OD/WT/Weight) *</Label>
                  <Select
                    value={item.sizeId}
                    onValueChange={(value) => handleSizeSelect(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipeSizesData?.pipeSizes?.map((size: any) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.sizeLabel} (OD: {size.od}mm, WT: {size.wt}mm, Weight: {size.weight}kg/m)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-4">
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

                <div className="grid grid-cols-5 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
              <div key={index} className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Input
                    value={term.termName}
                    onChange={(e) => updateTerm(index, "termName", e.target.value)}
                    placeholder="Term name"
                  />
                </div>
                <div className="col-span-3 grid gap-2">
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
