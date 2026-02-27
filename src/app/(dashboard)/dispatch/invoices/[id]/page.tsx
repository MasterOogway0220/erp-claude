"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CreditCard,
  Send,
  Download,
  Mail,
  FileJson,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { numberToWords } from "@/lib/amount-in-words";
import { PageLoading } from "@/components/shared/page-loading";

const invoiceTypeColors: Record<string, string> = {
  DOMESTIC: "bg-blue-500",
  EXPORT: "bg-purple-500",
  PROFORMA: "bg-yellow-500",
  CREDIT_NOTE: "bg-orange-500",
  DEBIT_NOTE: "bg-red-500",
};

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_PAID: "bg-yellow-500",
  PAID: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
  });
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string);
      fetchEmailLogs(params.id as string);
    }
  }, [params.id]);

  const fetchInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/dispatch/invoices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setInvoice(data.invoice);
    } catch (error) {
      toast.error("Failed to load invoice");
      router.push("/dispatch");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async (id: string) => {
    try {
      const response = await fetch(`/api/dispatch/invoices/${id}/emails`);
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.emailLogs || []);
      }
    } catch {
      // Non-critical
    }
  };

  const markAsSent = async () => {
    if (!invoice) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/dispatch/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success("Invoice marked as Sent");
      fetchInvoice(invoice.id);
    } catch (error) {
      toast.error("Failed to update invoice status");
    } finally {
      setUpdating(false);
    }
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/dispatch/invoices/${invoice.id}/pdf`
      );
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNo.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const downloadEInvoice = async () => {
    if (!invoice) return;
    try {
      const response = await fetch(
        `/api/dispatch/invoices/${invoice.id}/e-invoice`
      );
      if (!response.ok) throw new Error("Failed to generate e-invoice");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-invoice-${invoice.invoiceNo.replace(/\//g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("E-Invoice JSON downloaded");
    } catch (error) {
      toast.error("Failed to download e-invoice");
    }
  };

  const openEmailDialog = () => {
    if (!invoice) return;
    setEmailForm({
      to: invoice.customer?.email || "",
      cc: "",
      subject: `Invoice ${invoice.invoiceNo} - ${invoice.customer?.name || ""}`,
      message: "",
    });
    setEmailDialogOpen(true);
  };

  const sendEmail = async () => {
    if (!emailForm.to) {
      toast.error("Recipient email is required");
      return;
    }
    setSendingEmail(true);
    try {
      const response = await fetch(
        `/api/dispatch/invoices/${invoice.id}/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailForm),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send");
      }
      toast.success("Invoice emailed successfully");
      setEmailDialogOpen(false);
      fetchInvoice(invoice.id);
      fetchEmailLogs(invoice.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!invoice) return null;

  // Calculate balance due
  const totalPaid = (invoice.paymentReceipts || []).reduce(
    (sum: number, p: any) => sum + Number(p.amountReceived) + Number(p.tdsAmount),
    0
  );
  const balanceDue = Number(invoice.totalAmount) - totalPaid;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice: ${invoice.invoiceNo}`}
        description={`Created on ${format(new Date(invoice.invoiceDate), "dd MMM yyyy")}`}
      >
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={downloadPdf}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={openEmailDialog}>
            <Mail className="w-4 h-4 mr-2" />
            Email Invoice
          </Button>
          <Button variant="outline" onClick={downloadEInvoice}>
            <FileJson className="w-4 h-4 mr-2" />
            E-Invoice JSON
          </Button>
          {invoice.status === "DRAFT" && (
            <Button variant="outline" onClick={markAsSent} disabled={updating}>
              <Send className="w-4 h-4 mr-2" />
              {updating ? "Updating..." : "Mark as Sent"}
            </Button>
          )}
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <Button
              onClick={() =>
                router.push(`/dispatch/payments/create?invoiceId=${invoice.id}`)
              }
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Invoice Number
                </div>
                <div className="font-mono font-medium">
                  {invoice.invoiceNo}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Invoice Date
                </div>
                <div>
                  {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Invoice Type
                </div>
                <Badge
                  className={
                    invoiceTypeColors[invoice.invoiceType] || "bg-gray-500"
                  }
                >
                  {invoice.invoiceType?.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge
                  className={
                    invoiceStatusColors[invoice.status] || "bg-gray-500"
                  }
                >
                  {invoice.status?.replace(/_/g, " ")}
                </Badge>
              </div>
              {invoice.dueDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div>
                    {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                  </div>
                </div>
              )}
              {invoice.dispatchNote && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    Dispatch Note
                  </div>
                  <Link
                    href={`/dispatch/dispatch-notes/${invoice.dispatchNote.id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {invoice.dispatchNote.dnNo}
                  </Link>
                </div>
              )}
              {invoice.salesOrder && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    Sales Order
                  </div>
                  <Link
                    href={`/sales/${invoice.salesOrder.id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {invoice.salesOrder.soNo}
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm text-muted-foreground">Customer Name</div>
              <div className="font-medium">{invoice.customer?.name}</div>
            </div>
            {invoice.customer?.state && (
              <div>
                <div className="text-sm text-muted-foreground">State</div>
                <div>{invoice.customer.state}</div>
              </div>
            )}
            {invoice.customer?.gstNo && (
              <div>
                <div className="text-sm text-muted-foreground">GST Number</div>
                <div className="font-mono text-sm">{invoice.customer.gstNo}</div>
              </div>
            )}
            {invoice.customer?.city && (
              <div>
                <div className="text-sm text-muted-foreground">City</div>
                <div>{invoice.customer.city}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Heat No.</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>HSN Code</TableHead>
                <TableHead className="text-right">Qty (Mtr)</TableHead>
                <TableHead className="text-right">Unit Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sNo}</TableCell>
                  <TableCell className="font-medium">
                    {item.description || "---"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {item.heatNo || "---"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.sizeLabel || "---"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.hsnCode || "---"}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {"\u20B9"}{Number(item.unitRate).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {"\u20B9"}{Number(item.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.taxRate ? `${Number(item.taxRate)}%` : "---"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="space-y-2 min-w-[300px]">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{"\u20B9"}{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.cgst) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span>{"\u20B9"}{Number(invoice.cgst).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.sgst) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span>{"\u20B9"}{Number(invoice.sgst).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.igst) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span>{"\u20B9"}{Number(invoice.igst).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>
                  {"\u20B9"}{Number(invoice.totalAmount).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground italic">
                {numberToWords(Number(invoice.totalAmount), invoice.currency || "INR")}
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Total Paid</span>
                <span>{"\u20B9"}{totalPaid.toFixed(2)}</span>
              </div>
              <Separator />
              <div
                className={`flex justify-between text-lg font-bold ${
                  balanceDue > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                <span>Balance Due</span>
                <span>{"\u20B9"}{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/dispatch/payments/create?invoiceId=${invoice.id}`
                  )
                }
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(invoice.paymentReceipts || []).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No payments recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.paymentReceipts.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono font-medium">
                      {payment.receiptNo}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(payment.receiptDate),
                        "dd MMM yyyy"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.paymentMode}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.referenceNo || "---"}
                    </TableCell>
                    <TableCell>{payment.bankName || "---"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {"\u20B9"}{Number(payment.amountReceived).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(payment.tdsAmount) > 0
                        ? `${"\u20B9"}${Number(payment.tdsAmount).toFixed(2)}`
                        : "---"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.remarks || "---"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {emailLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent At</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.sentAt), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{log.sentTo}</TableCell>
                    <TableCell className="text-sm">{log.subject}</TableCell>
                    <TableCell className="text-sm">
                      {log.sentBy?.name || "---"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.status === "SUCCESS"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {invoice.invoiceNo} with PDF attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To *</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="recipient@example.com"
                value={emailForm.to}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, to: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-cc">CC</Label>
              <Input
                id="email-cc"
                type="email"
                placeholder="cc@example.com"
                value={emailForm.cc}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, cc: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                placeholder="Optional message to include in the email body"
                value={emailForm.message}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, message: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={sendingEmail}>
              <Mail className="w-4 h-4 mr-2" />
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
