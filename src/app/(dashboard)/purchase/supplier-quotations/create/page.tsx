"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  STANDARD_CHARGES,
  PRICING_UNITS,
  PRICE_BASIS_OPTIONS,
} from "@/lib/constants/supplier-quotations";

interface Vendor {
  id: string;
  name: string;
  city?: string;
}

interface RFQ {
  id: string;
  rfqNo: string;
}

interface LineItem {
  id: string;
  product: string;
  material: string;
  sizeLabel: string;
  quantity: string;
  uom: string;
  pricingUnit: string;
  unitRate: string;
  amount: number;
}

interface ChargeRow {
  id: string;
  chargeType: string;
  label: string;
  amount: string;
  taxApplicable: boolean;
  enabled: boolean;
  isCustom: boolean;
}

function createEmptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    product: "",
    material: "",
    sizeLabel: "",
    quantity: "",
    uom: "",
    pricingUnit: "PER_MTR",
    unitRate: "",
    amount: 0,
  };
}

function buildInitialCharges(): ChargeRow[] {
  return STANDARD_CHARGES.map((c) => ({
    id: crypto.randomUUID(),
    chargeType: c.value,
    label: c.label,
    amount: "",
    taxApplicable: false,
    enabled: false,
    isCustom: false,
  }));
}

export default function CreateSupplierQuotationPage() {
  const router = useRouter();

  // Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [vendorId, setVendorId] = useState("");
  const [vendorRef, setVendorRef] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [priceBasis, setPriceBasis] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rfqId, setRfqId] = useState("");

  // Items & charges
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [charges, setCharges] = useState<ChargeRow[]>(buildInitialCharges());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendorRes, rfqRes] = await Promise.all([
        fetch("/api/masters/vendors"),
        fetch("/api/purchase/rfq?status=SENT,PARTIALLY_RESPONDED,ALL_RESPONDED"),
      ]);

      if (vendorRes.ok) {
        const data = await vendorRes.json();
        setVendors(data.vendors || []);
      }

      if (rfqRes.ok) {
        const data = await rfqRes.json();
        setRfqs(data.rfqs || data || []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Item helpers
  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitRate") {
          const qty = parseFloat(field === "quantity" ? value : item.quantity) || 0;
          const rate = parseFloat(field === "unitRate" ? value : item.unitRate) || 0;
          updated.amount = qty * rate;
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  };

  // Charge helpers
  const toggleCharge = (id: string) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const updateCharge = (id: string, field: keyof ChargeRow, value: string | boolean) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeCharge = (id: string) => {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const addCustomCharge = () => {
    setCharges((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        chargeType: "CUSTOM",
        label: "",
        amount: "",
        taxApplicable: false,
        enabled: true,
        isCustom: true,
      },
    ]);
  };

  // Totals
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.amount || 0), 0),
    [items]
  );

  const enabledCharges = useMemo(
    () => charges.filter((c) => c.enabled),
    [charges]
  );

  const totalCharges = useMemo(
    () => enabledCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
    [enabledCharges]
  );

  const grandTotal = subtotal + totalCharges;

  // Submit
  const handleSubmit = async () => {
    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }

    const validItems = items.filter(
      (i) => i.product || i.material || i.sizeLabel || parseFloat(i.quantity) > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendorId,
        vendorRef: vendorRef || null,
        quotationDate: quotationDate || null,
        validUntil: validUntil || null,
        currency,
        paymentTerms: paymentTerms || null,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        priceBasis: priceBasis || null,
        rfqId: rfqId || null,
        remarks: remarks || null,
        items: validItems.map((item) => ({
          product: item.product,
          material: item.material,
          sizeLabel: item.sizeLabel,
          quantity: item.quantity,
          uom: item.uom,
          pricingUnit: item.pricingUnit,
          unitRate: item.unitRate,
          amount: item.amount,
        })),
        charges: enabledCharges.map((c) => ({
          chargeType: c.chargeType,
          label: c.label,
          amount: c.amount,
          taxApplicable: c.taxApplicable,
        })),
      };

      const res = await fetch("/api/purchase/supplier-quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Supplier Quotation created successfully");
        router.push(`/purchase/supplier-quotations/${data.id}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create quotation");
      }
    } catch {
      toast.error("Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      val
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Supplier Quotation"
        description="Record a vendor quotation with items, charges, and terms"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Side-by-side layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel — Document Placeholder (5/12) */}
        <div className="w-full lg:w-5/12">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg border-muted-foreground/25">
                <Upload className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">
                  Documents can be uploaded after saving the quotation
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                  PDF, images, and spreadsheets supported
                </p>
                <Button variant="outline" size="sm" disabled>
                  <FileText className="w-4 h-4 mr-2" />
                  Parse Document (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Form (7/12) */}
        <div className="w-full lg:w-7/12 space-y-6">
          {/* Section 1: Vendor & Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendor & Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Select
                    value={vendorId || "NONE"}
                    onValueChange={(v) => setVendorId(v === "NONE" ? "" : v)}
                  >
                    <SelectTrigger id="vendor" className="mt-1">
                      <SelectValue placeholder="Select vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" disabled>
                        Select vendor...
                      </SelectItem>
                      {loading ? (
                        <SelectItem value="__loading__" disabled>
                          Loading...
                        </SelectItem>
                      ) : vendors.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No vendors found
                        </SelectItem>
                      ) : (
                        vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {v.city ? ` — ${v.city}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vendorRef">Vendor Ref (Vendor&apos;s Quote No.)</Label>
                  <Input
                    id="vendorRef"
                    value={vendorRef}
                    onChange={(e) => setVendorRef(e.target.value)}
                    placeholder="e.g. VQ-2024-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quotationDate">Quotation Date</Label>
                  <Input
                    id="quotationDate"
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Items</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, createEmptyItem()])}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead className="min-w-[120px]">Product</TableHead>
                      <TableHead className="min-w-[120px]">Material</TableHead>
                      <TableHead className="min-w-[100px]">Size</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-20">UOM</TableHead>
                      <TableHead className="min-w-[130px]">Pricing Unit</TableHead>
                      <TableHead className="w-24">Unit Rate</TableHead>
                      <TableHead className="w-28 text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={item.product}
                            onChange={(e) => updateItem(item.id, "product", e.target.value)}
                            placeholder="Product"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.material}
                            onChange={(e) => updateItem(item.id, "material", e.target.value)}
                            placeholder="Material"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.sizeLabel}
                            onChange={(e) => updateItem(item.id, "sizeLabel", e.target.value)}
                            placeholder="Size"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            placeholder="0"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.uom}
                            onChange={(e) => updateItem(item.id, "uom", e.target.value)}
                            placeholder="MTR"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.pricingUnit}
                            onValueChange={(v) => updateItem(item.id, "pricingUnit", v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRICING_UNITS.map((pu) => (
                                <SelectItem key={pu.value} value={pu.value}>
                                  {pu.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitRate}
                            onChange={(e) => updateItem(item.id, "unitRate", e.target.value)}
                            placeholder="0.00"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Charges */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Additional Charges</CardTitle>
              <Button variant="outline" size="sm" onClick={addCustomCharge}>
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Charge
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {charges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-md border bg-muted/30"
                >
                  <Checkbox
                    checked={charge.enabled}
                    onCheckedChange={() => toggleCharge(charge.id)}
                  />
                  {charge.isCustom ? (
                    <Input
                      value={charge.label}
                      onChange={(e) => updateCharge(charge.id, "label", e.target.value)}
                      placeholder="Charge name"
                      className="h-8 max-w-[200px]"
                    />
                  ) : (
                    <span className="text-sm min-w-[180px]">{charge.label}</span>
                  )}
                  <Input
                    type="number"
                    value={charge.amount}
                    onChange={(e) => updateCharge(charge.id, "amount", e.target.value)}
                    placeholder="0.00"
                    className="h-8 w-32"
                    disabled={!charge.enabled}
                  />
                  <div className="flex items-center gap-2 ml-auto">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Tax Applicable
                    </Label>
                    <Switch
                      checked={charge.taxApplicable}
                      onCheckedChange={(v) => updateCharge(charge.id, "taxApplicable", v)}
                      disabled={!charge.enabled}
                    />
                  </div>
                  {charge.isCustom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeCharge(charge.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {charges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No charges configured
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. 30 days from invoice"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDays">Delivery Days</Label>
                  <Input
                    id="deliveryDays"
                    type="number"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    placeholder="e.g. 45"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="priceBasis">Price Basis</Label>
                  <Select
                    value={priceBasis || "NONE"}
                    onValueChange={(v) => setPriceBasis(v === "NONE" ? "" : v)}
                  >
                    <SelectTrigger id="priceBasis" className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" disabled>
                        Select...
                      </SelectItem>
                      {PRICE_BASIS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (Items)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Charges
                    {enabledCharges.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {enabledCharges.length} charge{enabledCharges.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </span>
                  <span>{formatCurrency(totalCharges)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Remarks + RFQ Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Remarks & RFQ Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes about this quotation..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="rfqLink">Link to RFQ (Optional)</Label>
                <Select
                  value={rfqId || "NONE"}
                  onValueChange={(v) => setRfqId(v === "NONE" ? "" : v)}
                >
                  <SelectTrigger id="rfqLink" className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {rfqs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.rfqNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3 pb-6">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Saving..." : "Save Quotation"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
