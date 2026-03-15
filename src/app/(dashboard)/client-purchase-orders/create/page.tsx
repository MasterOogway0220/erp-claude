"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Download,
  CheckSquare,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface Customer {
  id: string;
  name: string;
  city?: string;
  contactPerson?: string;
  currency?: string;
  state?: string;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  customer: { name: string };
}

interface BalanceItem {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  additionalSpec: string | null;
  sizeLabel: string | null;
  od: number | null;
  wt: number | null;
  ends: string | null;
  uom: string | null;
  hsnCode: string | null;
  qtyQuoted: number;
  totalOrdered: number;
  balanceQty: number;
  unitRate: number;
  amount: number;
  delivery: string | null;
  remark: string | null;
  previousOrders: { cpoNo: string; qtyOrdered: number }[];
}

interface SelectedItem extends BalanceItem {
  selected: boolean;
  qtyOrdered: number;
}

interface QuotationMeta {
  id: string;
  quotationNo: string;
  customer: {
    id: string;
    name: string;
    contactPerson: string | null;
    currency: string;
    state: string | null;
    gstNo: string | null;
  };
  currency: string;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  deliveryPeriod: string | null;
  supplierState: string | null;
  clientState: string | null;
  taxRate: number | null;
}

interface AdditionalCharge {
  label: string;
  key: string;
  amount: number;
  taxApplicable: boolean;
}

const DEFAULT_CHARGES: AdditionalCharge[] = [
  { label: "Freight", key: "freight", amount: 0, taxApplicable: false },
  { label: "TPI Charges", key: "tpiCharges", amount: 0, taxApplicable: false },
  { label: "Testing Charges", key: "testingCharges", amount: 0, taxApplicable: false },
  { label: "Packing & Forwarding", key: "packingForwarding", amount: 0, taxApplicable: false },
  { label: "Insurance", key: "insurance", amount: 0, taxApplicable: false },
  { label: "Others", key: "otherCharges", amount: 0, taxApplicable: false },
];

export default function CreateClientPOPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateClientPOPage />
    </Suspense>
  );
}

function CreateClientPOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedQuotationId = searchParams.get("quotationId");

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [quotationMeta, setQuotationMeta] = useState<QuotationMeta | null>(null);
  const [balanceItems, setBalanceItems] = useState<SelectedItem[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    quotationId: "",
    clientPoNumber: "",
    clientPoDate: format(new Date(), "yyyy-MM-dd"),
    projectName: "",
    contactPerson: "",
    paymentTerms: "",
    deliveryTerms: "",
    deliverySchedule: "",
    currency: "INR",
    remarks: "",
  });

  const [charges, setCharges] = useState<AdditionalCharge[]>(
    DEFAULT_CHARGES.map((c) => ({ ...c }))
  );
  const [gstRate, setGstRate] = useState<number>(18);
  const [supplierState, setSupplierState] = useState("");
  const [clientState, setClientState] = useState("");

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/masters/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch("/api/quotations?status=APPROVED,SENT,WON");
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations || []);
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    }
  };

  // Filter quotations when customer changes
  useEffect(() => {
    if (formData.customerId) {
      setFilteredQuotations(
        quotations.filter((q) => q.customerId === formData.customerId)
      );
    } else {
      setFilteredQuotations(quotations);
    }
  }, [formData.customerId, quotations]);

  const fetchQuotationBalance = useCallback(
    async (quotationId: string) => {
      if (!quotationId) return;
      setLoadingBalance(true);
      try {
        const response = await fetch(`/api/quotations/${quotationId}/balance`);
        if (!response.ok) throw new Error("Failed to fetch balance");

        const data = await response.json();
        setQuotationMeta(data.quotation);

        const selectedItems: SelectedItem[] = data.items.map((item: BalanceItem) => ({
          ...item,
          selected: item.balanceQty > 0,
          qtyOrdered: item.balanceQty,
        }));

        setBalanceItems(selectedItems);

        // Auto-fill form fields from quotation
        const q = data.quotation;
        setFormData((prev) => ({
          ...prev,
          customerId: q.customer.id,
          quotationId,
          contactPerson: prev.contactPerson || q.customer.contactPerson || "",
          paymentTerms: prev.paymentTerms || q.paymentTerms || "",
          deliveryTerms: prev.deliveryTerms || q.deliveryTerms || "",
          deliverySchedule: prev.deliverySchedule || q.deliveryPeriod || "",
          currency: q.currency || "INR",
        }));

        // Set state for GST
        if (q.supplierState) setSupplierState(q.supplierState);
        if (q.clientState) setClientState(q.clientState);
        if (q.taxRate) setGstRate(q.taxRate);
      } catch (error) {
        console.error("Failed to fetch quotation balance:", error);
        toast.error("Failed to load quotation items");
      } finally {
        setLoadingBalance(false);
      }
    },
    []
  );

  // Auto-select quotation from URL param
  useEffect(() => {
    if (preselectedQuotationId && quotations.length > 0 && !formData.quotationId) {
      setFormData((prev) => ({ ...prev, quotationId: preselectedQuotationId }));
      fetchQuotationBalance(preselectedQuotationId);
    }
  }, [preselectedQuotationId, quotations, formData.quotationId, fetchQuotationBalance]);

  const handleQuotationChange = (quotationId: string) => {
    setFormData((prev) => ({ ...prev, quotationId }));
    fetchQuotationBalance(quotationId);
  };

  const handleCustomerChange = (customerId: string) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      quotationId: "",
    }));
    setBalanceItems([]);
    setQuotationMeta(null);

    // Try to auto-fill client state from customer
    const selectedCustomer = customers.find((c) => c.id === customerId);
    if (selectedCustomer?.state) {
      setClientState(selectedCustomer.state);
    }
  };

  const toggleItemSelection = (index: number) => {
    setBalanceItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = () => {
    setBalanceItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.balanceQty > 0,
        qtyOrdered: item.selected ? item.qtyOrdered : item.balanceQty,
      }))
    );
  };

  const selectPartialItems = () => {
    setBalanceItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.balanceQty > 0 ? item.selected : false,
      }))
    );
  };

  const updateQtyOrdered = (index: number, value: string) => {
    const qty = parseFloat(value) || 0;
    setBalanceItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          qtyOrdered: Math.min(qty, item.balanceQty),
          selected: qty > 0,
        };
      })
    );
  };

  const updateCharge = (index: number, field: "amount" | "taxApplicable", value: any) => {
    setCharges((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, [field]: field === "amount" ? (parseFloat(value) || 0) : value }
          : c
      )
    );
  };

  const getSelectedItems = () => balanceItems.filter((item) => item.selected && item.qtyOrdered > 0);

  // =====================================================
  // Commercial Calculation (reactive, computed every render)
  // =====================================================
  const commercials = useMemo(() => {
    const selectedItems = getSelectedItems();
    const materialValue = selectedItems.reduce(
      (sum, item) => sum + item.qtyOrdered * item.unitRate,
      0
    );

    const additionalChargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);

    // Taxable = material value + charges where tax is applicable
    const taxableChargesAmount = charges
      .filter((c) => c.taxApplicable)
      .reduce((sum, c) => sum + c.amount, 0);

    const taxableAmount = materialValue + taxableChargesAmount;

    const isInterState = !!(supplierState && clientState && supplierState.toLowerCase() !== clientState.toLowerCase());

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstRate > 0 && taxableAmount > 0) {
      if (isInterState) {
        igst = (taxableAmount * gstRate) / 100;
      } else {
        cgst = (taxableAmount * gstRate) / 200;
        sgst = (taxableAmount * gstRate) / 200;
      }
    }

    const grandTotalBeforeRound = materialValue + additionalChargesTotal + cgst + sgst + igst;
    const roundOff = Math.round(grandTotalBeforeRound) - grandTotalBeforeRound;
    const grandTotal = grandTotalBeforeRound + roundOff;

    return {
      materialValue,
      additionalChargesTotal,
      taxableAmount,
      isInterState,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal,
    };
  }, [balanceItems, charges, gstRate, supplierState, clientState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a client");
      return;
    }
    if (!formData.quotationId) {
      toast.error("Please select a reference quotation");
      return;
    }
    if (!formData.clientPoNumber) {
      toast.error("Please enter the client P.O. number");
      return;
    }

    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to order");
      return;
    }

    for (const item of selectedItems) {
      if (item.qtyOrdered > item.balanceQty) {
        toast.error(
          `Item ${item.sNo} (${item.product}): Ordered qty (${item.qtyOrdered}) exceeds balance (${item.balanceQty})`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Build charge fields as flat keys
      const chargePayload: Record<string, any> = {};
      for (const c of charges) {
        chargePayload[c.key] = c.amount || 0;
        chargePayload[c.key + "TaxApplicable"] = c.taxApplicable;
      }
      // Fix naming for the "otherCharges" toggle key
      chargePayload["otherChargesTaxApplicable"] = charges.find(c => c.key === "otherCharges")?.taxApplicable ?? false;

      const response = await fetch("/api/client-purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          clientPoDate: formData.clientPoDate || null,
          ...chargePayload,
          gstRate,
          supplierState,
          clientState,
          items: selectedItems.map((item) => ({
            quotationItemId: item.id,
            product: item.product,
            material: item.material,
            additionalSpec: item.additionalSpec,
            sizeLabel: item.sizeLabel,
            od: item.od,
            wt: item.wt,
            ends: item.ends,
            uom: item.uom,
            hsnCode: item.hsnCode,
            qtyQuoted: item.qtyQuoted,
            qtyOrdered: item.qtyOrdered,
            unitRate: item.unitRate,
            deliveryDate: null,
            remark: item.remark,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create client purchase order");
      }

      const data = await response.json();
      toast.success(`Client P.O. ${data.cpoNo} registered successfully`);
      router.push(`/client-purchase-orders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fmtAmount = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currencySymbol = formData.currency === "INR" ? "\u20B9" : formData.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Client Purchase Order"
        description="Capture client's Purchase Order and link it with the quotation"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Client & Quotation Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Client P.O. Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.city ? ` (${c.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Quotation No. *</Label>
                <Select
                  value={formData.quotationId}
                  onValueChange={handleQuotationChange}
                  disabled={!formData.customerId && filteredQuotations.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Quotation" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.customerId ? filteredQuotations : quotations).map(
                      (q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quotationNo} - {q.customer?.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client P.O. Number *</Label>
                <Input
                  value={formData.clientPoNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPoNumber: e.target.value })
                  }
                  placeholder="Enter client's PO number"
                />
              </div>

              <div className="space-y-2">
                <Label>Client P.O. Date</Label>
                <Input
                  type="date"
                  value={formData.clientPoDate}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPoDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData({ ...formData, projectName: e.target.value })
                  }
                  placeholder="Enter project name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client Contact Person</Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="Contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: e.target.value })
                  }
                  placeholder="e.g. 30 days from invoice"
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Terms</Label>
                <Input
                  value={formData.deliveryTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryTerms: e.target.value })
                  }
                  placeholder="e.g. Ex-Works, FOB"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Delivery Schedule</Label>
                <Input
                  value={formData.deliverySchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, deliverySchedule: e.target.value })
                  }
                  placeholder="e.g. 4-6 weeks from PO"
                />
              </div>

              <div className="space-y-2">
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
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Any additional remarks"
                  rows={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Quotation Items Selection */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Select Quotation Items</CardTitle>
                {quotationMeta && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Quotation: {quotationMeta.quotationNo} | Items with available
                    balance are pre-selected
                  </p>
                )}
              </div>
              {balanceItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllItems}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import All Items
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectPartialItems}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select Partial
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!formData.quotationId ? (
              <div className="text-center text-muted-foreground py-12">
                Select a quotation above to load items
              </div>
            ) : loadingBalance ? (
              <PageLoading />
            ) : balanceItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No items found in this quotation
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead className="w-[50px]">S.No</TableHead>
                        <TableHead>Product Description</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Qty Quoted</TableHead>
                        <TableHead className="text-right">Already Ordered</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right w-[130px]">Qty Ordered</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceItems.map((item, index) => {
                        const isFullyOrdered = item.balanceQty <= 0;
                        return (
                          <TableRow
                            key={item.id}
                            className={
                              isFullyOrdered
                                ? "opacity-50 bg-muted/30"
                                : item.selected
                                ? "bg-primary/5"
                                : ""
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                disabled={isFullyOrdered}
                                onCheckedChange={() => toggleItemSelection(index)}
                              />
                            </TableCell>
                            <TableCell>{item.sNo}</TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-sm">
                                  {item.product || "-"}
                                </div>
                                {item.material && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.material}
                                    {item.additionalSpec
                                      ? ` / ${item.additionalSpec}`
                                      : ""}
                                  </div>
                                )}
                                {item.ends && (
                                  <div className="text-xs text-muted-foreground">
                                    Ends: {item.ends}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.sizeLabel || "-"}
                              {item.od && item.wt && (
                                <div className="text-xs text-muted-foreground">
                                  OD: {item.od} / WT: {item.wt}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.qtyQuoted}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.totalOrdered > 0 ? (
                                <div>
                                  <span className="text-orange-600 font-medium">
                                    {item.totalOrdered}
                                  </span>
                                  {item.previousOrders.length > 0 && (
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {item.previousOrders.map((o) => (
                                        <div key={o.cpoNo}>
                                          {o.cpoNo}: {o.qtyOrdered}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isFullyOrdered ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Fully Ordered
                                </Badge>
                              ) : (
                                <span className="font-semibold text-green-600">
                                  {item.balanceQty}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isFullyOrdered ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max={item.balanceQty}
                                  value={item.qtyOrdered || ""}
                                  onChange={(e) =>
                                    updateQtyOrdered(index, e.target.value)
                                  }
                                  className="h-8 w-[110px] text-right"
                                  disabled={!item.selected && !isFullyOrdered}
                                />
                              )}
                              {item.qtyOrdered > item.balanceQty && (
                                <div className="flex items-center gap-1 text-destructive text-[10px] mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  Exceeds balance
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{item.uom || "Mtr"}</TableCell>
                            <TableCell className="text-right">
                              {item.unitRate.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.selected && item.qtyOrdered > 0
                                ? (item.qtyOrdered * item.unitRate).toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 }
                                  )
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Material Value Summary */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      {getSelectedItems().length} of {balanceItems.length} items
                      selected
                    </div>
                    <div className="text-base font-semibold">
                      Material Value: {currencySymbol} {fmtAmount(commercials.materialValue)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Additional Charges */}
        {getSelectedItems().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Additional Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Charge Type</TableHead>
                    <TableHead className="w-[200px]">Amount ({currencySymbol})</TableHead>
                    <TableHead className="w-[150px]">Tax Applicable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((charge, index) => (
                    <TableRow key={charge.key}>
                      <TableCell className="font-medium">{charge.label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={charge.amount || ""}
                          onChange={(e) => updateCharge(index, "amount", e.target.value)}
                          placeholder="0.00"
                          className="h-9 w-[180px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={charge.taxApplicable}
                            onCheckedChange={(checked) =>
                              updateCharge(index, "taxApplicable", checked)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {charge.taxApplicable ? "Yes" : "No"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-3 pt-3 border-t flex justify-end">
                <span className="text-sm font-semibold">
                  Total Additional Charges: {currencySymbol}{" "}
                  {fmtAmount(commercials.additionalChargesTotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: GST Calculation */}
        {getSelectedItems().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                GST Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* State & GST Rate inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Supplier State</Label>
                  <Input
                    value={supplierState}
                    onChange={(e) => setSupplierState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client State</Label>
                  <Input
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    placeholder="e.g. Gujarat"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GST Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="28"
                    value={gstRate || ""}
                    onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 18"
                  />
                </div>
              </div>

              {supplierState && clientState && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={commercials.isInterState ? "destructive" : "default"}
                  >
                    {commercials.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {supplierState} → {clientState}
                  </span>
                </div>
              )}

              <Separator />

              {/* GST Summary Table */}
              <div className="max-w-md ml-auto">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Material Value</TableCell>
                      <TableCell className="text-right">
                        {currencySymbol} {fmtAmount(commercials.materialValue)}
                      </TableCell>
                    </TableRow>
                    {commercials.additionalChargesTotal > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Additional Charges</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {fmtAmount(commercials.additionalChargesTotal)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold">Taxable Amount</TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol} {fmtAmount(commercials.taxableAmount)}
                      </TableCell>
                    </TableRow>
                    {!commercials.isInterState && gstRate > 0 && (
                      <>
                        <TableRow>
                          <TableCell className="text-muted-foreground">
                            CGST @ {gstRate / 2}%
                          </TableCell>
                          <TableCell className="text-right">
                            {currencySymbol} {fmtAmount(commercials.cgst)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-muted-foreground">
                            SGST @ {gstRate / 2}%
                          </TableCell>
                          <TableCell className="text-right">
                            {currencySymbol} {fmtAmount(commercials.sgst)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                    {commercials.isInterState && gstRate > 0 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground">
                          IGST @ {gstRate}%
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {fmtAmount(commercials.igst)}
                        </TableCell>
                      </TableRow>
                    )}
                    {commercials.roundOff !== 0 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground">Round Off</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {commercials.roundOff > 0 ? "+" : ""}
                          {fmtAmount(commercials.roundOff)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2 bg-muted/30">
                      <TableCell className="font-bold text-base">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {currencySymbol} {fmtAmount(commercials.grandTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || getSelectedItems().length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Registering..." : "Register Client P.O."}
          </Button>
        </div>
      </form>
    </div>
  );
}
