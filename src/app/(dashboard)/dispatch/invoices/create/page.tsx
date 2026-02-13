"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoiceItem {
  sNo: number;
  description: string;
  heatNo: string;
  sizeLabel: string;
  quantity: string;
  unitRate: string;
  amount: string;
  hsnCode: string;
  taxRate: string;
}

interface TaxRateOption {
  id: string;
  code: string | null;
  name: string;
  percentage: number | string;
  taxType: string | null;
  isActive: boolean;
}

const COMPANY_STATE = "Maharashtra";

export default function CreateInvoicePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <CreateInvoicePage />
    </Suspense>
  );
}

function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDnId = searchParams.get("dnId") || "";

  const [loading, setLoading] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState<any[]>([]);
  const [selectedDN, setSelectedDN] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [taxRates, setTaxRates] = useState<TaxRateOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState<string>("18");

  const [formData, setFormData] = useState({
    dispatchNoteId: preselectedDnId,
    invoiceType: "DOMESTIC",
    dueDate: format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    ),
    eWayBillNo: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchDispatchNotes();
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      const response = await fetch("/api/masters/tax");
      if (response.ok) {
        const data = await response.json();
        const rates: TaxRateOption[] = (data.taxRates || []).filter(
          (t: TaxRateOption) => t.isActive
        );
        setTaxRates(rates);
        // Set default tax rate from the first active GST rate
        const firstGst = rates.find(
          (r) =>
            r.taxType === "IGST" ||
            r.taxType === "CGST" ||
            r.taxType === "SGST" ||
            Number(r.percentage) > 0
        );
        if (firstGst) {
          setDefaultTaxRate(String(Number(firstGst.percentage)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch tax rates:", error);
    }
  };

  useEffect(() => {
    if (formData.dispatchNoteId) {
      loadDispatchNote(formData.dispatchNoteId);
    } else {
      setSelectedDN(null);
      setCustomer(null);
      setItems([]);
    }
  }, [formData.dispatchNoteId]);

  const fetchDispatchNotes = async () => {
    try {
      const response = await fetch("/api/dispatch/dispatch-notes");
      if (response.ok) {
        const data = await response.json();
        setDispatchNotes(data.dispatchNotes || []);
      }
    } catch (error) {
      console.error("Failed to fetch dispatch notes:", error);
    }
  };

  const loadDispatchNote = async (dnId: string) => {
    const dn = dispatchNotes.find((d) => d.id === dnId);
    if (!dn) return;

    setSelectedDN(dn);

    // Fetch packing list items for this DN
    if (dn.packingList?.id) {
      try {
        const plRes = await fetch(
          `/api/dispatch/packing-lists/${dn.packingList.id}`
        );
        if (plRes.ok) {
          const plData = await plRes.json();
          const pl = plData.packingList;
          setCustomer(pl.salesOrder?.customer || null);

          // Auto-populate items from packing list
          const invoiceItems: InvoiceItem[] = (pl.items || []).map(
            (item: any, index: number) => ({
              sNo: index + 1,
              description: [
                item.inventoryStock?.product,
                item.material,
                item.sizeLabel,
              ]
                .filter(Boolean)
                .join(" - "),
              heatNo: item.heatNo || item.inventoryStock?.heatNo || "",
              sizeLabel: item.sizeLabel || item.inventoryStock?.sizeLabel || "",
              quantity: String(Number(item.quantityMtr)),
              unitRate: "0",
              amount: "0",
              hsnCode: "73044900",
              taxRate: defaultTaxRate,
            })
          );

          setItems(invoiceItems);
        }
      } catch (error) {
        console.error("Failed to load packing list:", error);
      }
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate amount
    if (field === "quantity" || field === "unitRate") {
      const qty =
        field === "quantity" ? parseFloat(value) || 0 : parseFloat(updated[index].quantity) || 0;
      const rate =
        field === "unitRate" ? parseFloat(value) || 0 : parseFloat(updated[index].unitRate) || 0;
      updated[index].amount = (qty * rate).toFixed(2);
    }

    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        sNo: items.length + 1,
        description: "",
        heatNo: "",
        sizeLabel: "",
        quantity: "0",
        unitRate: "0",
        amount: "0",
        hsnCode: "73044900",
        taxRate: defaultTaxRate,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updated = items.filter((_, i) => i !== index);
      setItems(
        updated.map((item, i) => ({ ...item, sNo: i + 1 }))
      );
    }
  };

  // Tax calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  const isExport = formData.invoiceType === "EXPORT";
  const isIntraState = customer?.state === COMPANY_STATE;
  const taxRate = items.length > 0 ? parseFloat(items[0].taxRate) || 0 : 0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (!isExport && taxRate > 0) {
    if (isIntraState) {
      cgst = (subtotal * taxRate) / 200;
      sgst = (subtotal * taxRate) / 200;
    } else {
      igst = (subtotal * taxRate) / 100;
    }
  }

  const totalAmount = subtotal + cgst + sgst + igst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dispatchNoteId) {
      toast.error("Please select a Dispatch Note");
      return;
    }

    if (!selectedDN || !customer) {
      toast.error("Dispatch note or customer data missing");
      return;
    }

    const validItems = items.filter(
      (item) => parseFloat(item.quantity) > 0 && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one item with valid quantity and amount");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dispatch/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchNoteId: formData.dispatchNoteId,
          salesOrderId: selectedDN.salesOrder?.id,
          customerId: customer.id,
          invoiceType: formData.invoiceType,
          dueDate: formData.dueDate || null,
          eWayBillNo: formData.eWayBillNo || null,
          currency: "INR",
          items: validItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invoice");
      }

      const data = await response.json();
      toast.success(`Invoice ${data.invoiceNo} created successfully`);
      router.push(`/dispatch/invoices/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Generate invoice from dispatched materials"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dispatch Note *</Label>
                <Select
                  value={formData.dispatchNoteId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dispatchNoteId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Dispatch Note" />
                  </SelectTrigger>
                  <SelectContent>
                    {dispatchNotes.map((dn) => (
                      <SelectItem key={dn.id} value={dn.id}>
                        {dn.dnNo} - {dn.salesOrder?.soNo} (
                        {dn.salesOrder?.customer?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Type *</Label>
                <Select
                  value={formData.invoiceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, invoiceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOMESTIC">Domestic</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                    <SelectItem value="PROFORMA">Proforma</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                    <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>E-Way Bill No.</Label>
                <Input
                  value={formData.eWayBillNo}
                  onChange={(e) =>
                    setFormData({ ...formData, eWayBillNo: e.target.value })
                  }
                  placeholder="Enter E-Way Bill number"
                />
              </div>
            </div>

            {customer && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Customer
                    </div>
                    <div className="font-medium">{customer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">State</div>
                    <div>{customer.state || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      GST Number
                    </div>
                    <div className="font-mono">
                      {customer.gstNo || "Not specified"}
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {isExport ? (
                    <span>Export invoice - No GST applicable</span>
                  ) : isIntraState ? (
                    <span>
                      Intra-state supply (same state: {COMPANY_STATE}) - CGST +
                      SGST applicable
                    </span>
                  ) : (
                    <span>
                      Inter-state supply ({customer.state || "N/A"} to{" "}
                      {COMPANY_STATE}) - IGST applicable
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Select a dispatch note to auto-populate items, or add items
                manually.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Item #{item.sNo}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Heat No.</Label>
                        <Input
                          value={item.heatNo}
                          onChange={(e) =>
                            updateItem(index, "heatNo", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Input
                          value={item.sizeLabel}
                          onChange={(e) =>
                            updateItem(index, "sizeLabel", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">HSN Code</Label>
                        <Input
                          value={item.hsnCode}
                          onChange={(e) =>
                            updateItem(index, "hsnCode", e.target.value)
                          }
                          placeholder="HSN"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tax Rate (%)</Label>
                        {taxRates.length > 0 ? (
                          <Select
                            value={item.taxRate}
                            onValueChange={(value) =>
                              updateItem(index, "taxRate", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tax rate" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxRates.map((rate) => (
                                <SelectItem
                                  key={rate.id}
                                  value={String(Number(rate.percentage))}
                                >
                                  {rate.name} ({Number(rate.percentage)}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateItem(index, "taxRate", e.target.value)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity (Mtr) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit Rate *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitRate}
                          onChange={(e) =>
                            updateItem(index, "unitRate", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input value={item.amount} disabled className="bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tax Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {"\u20B9"}{subtotal.toFixed(2)}
                  </span>
                </div>
                {!isExport && isIntraState && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        CGST ({taxRate / 2}%)
                      </span>
                      <span>{"\u20B9"}{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        SGST ({taxRate / 2}%)
                      </span>
                      <span>{"\u20B9"}{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {!isExport && !isIntraState && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      IGST ({taxRate}%)
                    </span>
                    <span>{"\u20B9"}{igst.toFixed(2)}</span>
                  </div>
                )}
                {isExport && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax (Export - 0%)
                    </span>
                    <span>{"\u20B9"}0.00</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{"\u20B9"}{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || items.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
