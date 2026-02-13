"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateDebitNotePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [debitItems, setDebitItems] = useState<any[]>([
    { description: "", quantity: 1, unitRate: 0, amount: 0, hsnCode: "", taxRate: 18 },
  ]);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/dispatch/invoices");
      if (res.ok) {
        const data = await res.json();
        const regularInvoices = (data.invoices || []).filter(
          (inv: any) => inv.invoiceType === "DOMESTIC" || inv.invoiceType === "EXPORT"
        );
        setInvoices(regularInvoices);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    setSelectedInvoice(inv);
  };

  const addItem = () => {
    setDebitItems([
      ...debitItems,
      { description: "", quantity: 1, unitRate: 0, amount: 0, hsnCode: "", taxRate: 18 },
    ]);
  };

  const removeItem = (index: number) => {
    if (debitItems.length <= 1) return;
    setDebitItems(debitItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...debitItems];
    updated[index][field] = field === "description" || field === "hsnCode" ? value : parseFloat(value) || 0;
    if (field === "quantity" || field === "unitRate") {
      updated[index].amount = (parseFloat(updated[index].quantity) || 0) * (parseFloat(updated[index].unitRate) || 0);
    }
    setDebitItems(updated);
  };

  const totalAmount = debitItems.reduce((sum, i) => sum + (i.amount || 0), 0);

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error("Please select an original invoice");
      return;
    }

    const validItems = debitItems.filter((i) => i.description && i.amount > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one debit item with amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dispatch/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: selectedInvoice.salesOrderId,
          customerId: selectedInvoice.customerId,
          invoiceType: "DEBIT_NOTE",
          originalInvoiceId: selectedInvoice.id,
          currency: selectedInvoice.currency,
          items: validItems.map((item: any, idx: number) => ({
            sNo: idx + 1,
            description: `Debit Note: ${item.description} - ${remarks || "Additional charges"}`,
            quantity: item.quantity,
            unitRate: item.unitRate,
            amount: item.amount,
            hsnCode: item.hsnCode,
            taxRate: item.taxRate,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create debit note");
        return;
      }

      const data = await res.json();
      toast.success(`Debit Note ${data.invoiceNo} created`);
      router.push(`/dispatch/invoices/${data.id}`);
    } catch (error) {
      toast.error("Failed to create debit note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Debit Note"
        description="Issue a debit note for additional charges against an invoice"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Original Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice *</Label>
            <Select onValueChange={handleSelectInvoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNo} — {inv.customer?.name} — ₹{Number(inv.totalAmount).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedInvoice && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Original Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Invoice No.</span>
                  <p className="font-mono font-medium">{selectedInvoice.invoiceNo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Date</span>
                  <p>{format(new Date(selectedInvoice.invoiceDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Customer</span>
                  <p>{selectedInvoice.customer?.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <p className="font-medium">₹{Number(selectedInvoice.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Debit Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}>
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Description *</th>
                      <th className="p-2 text-left">HSN Code</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Tax %</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitItems.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder="Additional charge description"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.hsnCode}
                            onChange={(e) => updateItem(idx, "hsnCode", e.target.value)}
                            placeholder="HSN"
                            className="w-24"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.unitRate}
                            onChange={(e) => updateItem(idx, "unitRate", e.target.value)}
                            className="w-28 text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          ₹{(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateItem(idx, "taxRate", e.target.value)}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => removeItem(idx)}
                            disabled={debitItems.length <= 1}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center border-t pt-4">
                <div className="space-y-2 flex-1 mr-4">
                  <Label>Reason / Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Reason for debit note..."
                    rows={2}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Debit Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Debit Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
