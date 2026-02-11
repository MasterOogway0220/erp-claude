"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  paymentReceipts: Array<{
    amountReceived: number;
    tdsAmount: number;
  }>;
}

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_PAID: "bg-yellow-500",
  PAID: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export default function CreatePaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <CreatePaymentPage />
    </Suspense>
  );
}

function CreatePaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get("invoiceId") || "";

  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    invoiceId: preselectedInvoiceId,
    amountReceived: "",
    paymentMode: "NEFT",
    referenceNo: "",
    bankName: "",
    tdsAmount: "0",
    remarks: "",
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (formData.invoiceId) {
      const inv = invoices.find((i) => i.id === formData.invoiceId);
      setSelectedInvoice(inv || null);
    } else {
      setSelectedInvoice(null);
    }
  }, [formData.invoiceId, invoices]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/dispatch/invoices");
      if (response.ok) {
        const data = await response.json();
        // Show only outstanding invoices (not PAID or CANCELLED)
        const outstanding = (data.invoices || []).filter(
          (inv: Invoice) =>
            inv.status !== "PAID" && inv.status !== "CANCELLED"
        );
        setInvoices(outstanding);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  };

  // Calculate balance for selected invoice
  const getInvoiceBalance = (inv: Invoice | null) => {
    if (!inv) return 0;
    const totalPaid = (inv.paymentReceipts || []).reduce(
      (sum, p) => sum + Number(p.amountReceived) + Number(p.tdsAmount),
      0
    );
    return Number(inv.totalAmount) - totalPaid;
  };

  const balance = getInvoiceBalance(selectedInvoice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoiceId) {
      toast.error("Please select an Invoice");
      return;
    }

    if (!selectedInvoice) {
      toast.error("Invoice not found");
      return;
    }

    const amount = parseFloat(formData.amountReceived);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const tds = parseFloat(formData.tdsAmount) || 0;
    if (amount + tds > balance) {
      toast.error(
        `Total (amount + TDS) cannot exceed the balance due of ${"\u20B9"}${balance.toFixed(2)}`
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dispatch/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          customerId: selectedInvoice.customer?.id,
          amountReceived: formData.amountReceived,
          paymentMode: formData.paymentMode,
          referenceNo: formData.referenceNo || null,
          bankName: formData.bankName || null,
          tdsAmount: formData.tdsAmount || "0",
          remarks: formData.remarks || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record payment");
      }

      const data = await response.json();
      toast.success(`Payment ${data.receiptNo} recorded successfully`);
      router.push(`/dispatch/invoices/${formData.invoiceId}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Payment"
        description="Record a payment receipt against an invoice"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice *</Label>
              <Select
                value={formData.invoiceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, invoiceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an outstanding invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => {
                    const invBalance = getInvoiceBalance(inv);
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNo} - {inv.customer?.name} (Balance:{" "}
                        {"\u20B9"}{invBalance.toFixed(2)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoice && (
              <>
                <Separator />
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Invoice No.
                    </div>
                    <div className="font-mono font-medium">
                      {selectedInvoice.invoiceNo}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Invoice Date
                    </div>
                    <div>
                      {format(
                        new Date(selectedInvoice.invoiceDate),
                        "dd MMM yyyy"
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Customer
                    </div>
                    <div className="font-medium">
                      {selectedInvoice.customer?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge
                      className={
                        invoiceStatusColors[selectedInvoice.status] ||
                        "bg-gray-500"
                      }
                    >
                      {selectedInvoice.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Total Invoice Amount
                    </div>
                    <div className="text-xl font-bold">
                      {"\u20B9"}{Number(selectedInvoice.totalAmount).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Already Paid
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {"\u20B9"}
                      {(
                        Number(selectedInvoice.totalAmount) - balance
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Balance Due
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {"\u20B9"}{balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Received *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amountReceived}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amountReceived: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="LC">Letter of Credit (LC)</SelectItem>
                    <SelectItem value="TT">Telegraphic Transfer (TT)</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={formData.referenceNo}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceNo: e.target.value })
                  }
                  placeholder="UTR / Cheque / LC number"
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                  placeholder="Bank name"
                />
              </div>
              <div className="space-y-2">
                <Label>TDS Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.tdsAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, tdsAmount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                rows={2}
                placeholder="Optional remarks..."
              />
            </div>

            {formData.amountReceived && selectedInvoice && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Amount Received
                    </div>
                    <div className="text-lg font-bold">
                      {"\u20B9"}
                      {(parseFloat(formData.amountReceived) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      TDS Deducted
                    </div>
                    <div className="text-lg font-bold">
                      {"\u20B9"}
                      {(parseFloat(formData.tdsAmount) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Remaining Balance
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        balance -
                          (parseFloat(formData.amountReceived) || 0) -
                          (parseFloat(formData.tdsAmount) || 0) <=
                        0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {"\u20B9"}
                      {(
                        balance -
                        (parseFloat(formData.amountReceived) || 0) -
                        (parseFloat(formData.tdsAmount) || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.invoiceId || !formData.amountReceived}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
