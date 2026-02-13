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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateCreditNotePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
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
        // Filter to only regular invoices (not credit/debit notes)
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
    if (inv?.items) {
      setItems(
        inv.items.map((item: any) => ({
          ...item,
          adjustmentAmount: 0,
          adjustmentQty: 0,
          include: false,
        }))
      );
    }
  };

  const toggleItem = (index: number) => {
    const updated = [...items];
    updated[index].include = !updated[index].include;
    setItems(updated);
  };

  const updateAdjustment = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index][field] = parseFloat(value) || 0;
    if (field === "adjustmentQty") {
      updated[index].adjustmentAmount =
        (parseFloat(value) || 0) * Number(updated[index].unitRate);
    }
    setItems(updated);
  };

  const totalAdjustment = items
    .filter((i) => i.include)
    .reduce((sum, i) => sum + (i.adjustmentAmount || 0), 0);

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error("Please select an original invoice");
      return;
    }

    const includedItems = items.filter((i) => i.include && i.adjustmentAmount > 0);
    if (includedItems.length === 0) {
      toast.error("Please select at least one item with an adjustment amount");
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
          invoiceType: "CREDIT_NOTE",
          originalInvoiceId: selectedInvoice.id,
          currency: selectedInvoice.currency,
          items: includedItems.map((item: any, idx: number) => ({
            sNo: idx + 1,
            description: `Credit Note: ${item.description || ""} - ${remarks || "Adjustment"}`,
            heatNo: item.heatNo,
            sizeLabel: item.sizeLabel,
            quantity: item.adjustmentQty || item.quantity,
            unitRate: item.unitRate,
            amount: item.adjustmentAmount,
            hsnCode: item.hsnCode,
            taxRate: item.taxRate,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create credit note");
        return;
      }

      const data = await res.json();
      toast.success(`Credit Note ${data.invoiceNo} created`);
      router.push(`/dispatch/invoices/${data.id}`);
    } catch (error) {
      toast.error("Failed to create credit note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Credit Note"
        description="Issue a credit note against an existing invoice"
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
              <CardTitle>Original Invoice Details</CardTitle>
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
              <CardTitle>Adjustment Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Include</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Heat No.</th>
                      <th className="p-2 text-right">Orig Qty</th>
                      <th className="p-2 text-right">Orig Amount</th>
                      <th className="p-2 text-right">Adj Qty</th>
                      <th className="p-2 text-right">Adj Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={item.include}
                            onChange={() => toggleItem(idx)}
                          />
                        </td>
                        <td className="p-2">{item.description || "—"}</td>
                        <td className="p-2 font-mono">{item.heatNo || "—"}</td>
                        <td className="p-2 text-right">{Number(item.quantity).toFixed(3)}</td>
                        <td className="p-2 text-right">₹{Number(item.amount).toFixed(2)}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="w-24 text-right"
                            value={item.adjustmentQty || ""}
                            onChange={(e) => updateAdjustment(idx, "adjustmentQty", e.target.value)}
                            disabled={!item.include}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="w-28 text-right"
                            value={item.adjustmentAmount || ""}
                            onChange={(e) => updateAdjustment(idx, "adjustmentAmount", e.target.value)}
                            disabled={!item.include}
                          />
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
                    placeholder="Reason for credit note..."
                    rows={2}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Credit Amount</p>
                  <p className="text-2xl font-bold text-orange-600">₹{totalAdjustment.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Credit Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
