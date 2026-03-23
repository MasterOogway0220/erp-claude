"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Mail,
  FileSpreadsheet,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { PageLoading } from "@/components/shared/page-loading";

interface StatusReportItem {
  sNo: number;
  product: string;
  material: string;
  size: string;
  qtyOrdered: number;
  qtyDispatched: number;
  qtyBalance: number;
  materialPrepared: string;
  inspectionStatus: string;
  testingStatus: string;
  heatNo: string;
  expectedDispatchDate: string;
  remarks: string;
}

interface ReportData {
  reportDate: string;
  customer: {
    name: string;
    contactPerson?: string | null;
  };
  salesOrder: {
    soNo: string;
    soDate: string;
    customerPoNo?: string | null;
    customerPoDate?: string | null;
    projectName?: string | null;
    deliverySchedule?: string | null;
    status: string;
  };
  items: StatusReportItem[];
  summary: {
    totalItems: number;
    totalOrdered: number;
    totalDispatched: number;
    totalBalance: number;
    inspectionComplete: number;
    testingComplete: number;
    materialReady: number;
  };
}

interface SalesOrder {
  id: string;
  soNo: string;
  status: string;
  customerPoNo: string | null;
  customer: { name: string; email?: string | null };
}

const STATUS_COLORS: Record<string, string> = {
  Completed: "text-green-600",
  "In Progress": "text-blue-600",
  Pending: "text-amber-600",
  Ready: "text-green-600",
  Failed: "text-red-600",
  "N/A": "text-muted-foreground",
};

export default function ClientStatusReportPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [selectedSOId, setSelectedSOId] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSOs, setLoadingSOs] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [soSearch, setSOSearch] = useState("");

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (selectedSOId) {
      fetchReport(selectedSOId);
    } else {
      setReportData(null);
    }
  }, [selectedSOId]);

  const fetchSalesOrders = async () => {
    try {
      setLoadingSOs(true);
      const res = await fetch("/api/sales-orders");
      if (res.ok) {
        const data = await res.json();
        setSalesOrders(data.salesOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch SOs:", error);
    } finally {
      setLoadingSOs(false);
    }
  };

  const fetchReport = async (soId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/client-status/${soId}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to load report");
      }
    } catch (error) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedSOId) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/reports/client-status/${selectedSOId}/pdf`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : "order-status-report.pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedSOId) return;
    setDownloadingExcel(true);
    try {
      const res = await fetch(
        `/api/reports/client-status/${selectedSOId}/excel`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : "order-status-report.csv";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Excel (CSV) downloaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to download Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const openEmailDialog = () => {
    if (!reportData) return;
    // Pre-fill with customer info
    const so = salesOrders.find((s) => s.id === selectedSOId);
    setEmailTo(so?.customer?.email || "");
    setEmailCc("");
    setEmailSubject(
      `Order Status Report - ${reportData.salesOrder.soNo}${reportData.salesOrder.customerPoNo ? ` (PO: ${reportData.salesOrder.customerPoNo})` : ""}`
    );
    setEmailMessage("");
    setShowEmailDialog(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(
        `/api/reports/client-status/${selectedSOId}/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailTo,
            cc: emailCc,
            subject: emailSubject,
            message: emailMessage,
          }),
        }
      );
      if (res.ok) {
        toast.success("Status report sent to client");
        setShowEmailDialog(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send email");
      }
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter SOs by search
  const filteredSOs = salesOrders.filter((so) => {
    if (!soSearch) return true;
    const q = soSearch.toLowerCase();
    return (
      so.soNo.toLowerCase().includes(q) ||
      so.customer.name.toLowerCase().includes(q) ||
      (so.customerPoNo || "").toLowerCase().includes(q)
    );
  });

  const { summary } = reportData || { summary: null };
  const dispPct =
    summary && summary.totalOrdered > 0
      ? Math.round((summary.totalDispatched / summary.totalOrdered) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Order Status Report"
        description="Generate comprehensive order status reports for client communication"
      />

      {/* SO Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Sales Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SO No., Customer, PO No..."
                value={soSearch}
                onChange={(e) => setSOSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSOId || "NONE"} onValueChange={(v) => setSelectedSOId(v === "NONE" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[350px]">
                <SelectValue placeholder="Select Sales Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE" disabled>Select Sales Order</SelectItem>
                {loadingSOs ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  filteredSOs.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.soNo} — {so.customer.name}
                      {so.customerPoNo ? ` (PO: ${so.customerPoNo})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && <PageLoading />}

      {/* Report Display */}
      {reportData && !loading && (
        <>
          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {downloadingPdf ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
            >
              {downloadingExcel ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              {downloadingExcel ? "Generating..." : "Download Excel"}
            </Button>
            <Button onClick={openEmailDialog}>
              <Mail className="w-4 h-4 mr-2" />
              Email to Client
            </Button>
          </div>

          {/* Order Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{reportData.customer.name}</span>
                </div>
                {reportData.customer.contactPerson && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact</span>
                    <span>{reportData.customer.contactPerson}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SO No.</span>
                  <span className="font-medium">{reportData.salesOrder.soNo}</span>
                </div>
                {reportData.salesOrder.customerPoNo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client PO</span>
                    <span className="font-medium">{reportData.salesOrder.customerPoNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{reportData.salesOrder.status.replace(/_/g, " ")}</Badge>
                </div>
                {reportData.salesOrder.projectName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project</span>
                    <span>{reportData.salesOrder.projectName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold">{summary!.totalItems}</div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{dispPct}%</div>
                <div className="text-xs text-muted-foreground">Dispatched</div>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${dispPct}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary!.materialReady}/{summary!.totalItems}
                </div>
                <div className="text-xs text-muted-foreground">Material Ready</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {summary!.inspectionComplete}/{summary!.totalItems}
                </div>
                <div className="text-xs text-muted-foreground">Inspection Done</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {summary!.testingComplete}/{summary!.totalItems}
                </div>
                <div className="text-xs text-muted-foreground">Testing Done</div>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Item-wise Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Heat No.</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Dispatched</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Inspection</TableHead>
                      <TableHead>Testing</TableHead>
                      <TableHead>Exp. Dispatch</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.items.map((item) => (
                      <TableRow key={item.sNo}>
                        <TableCell className="text-muted-foreground">
                          {item.sNo}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product || "\u2014"}
                        </TableCell>
                        <TableCell>{item.material || "\u2014"}</TableCell>
                        <TableCell>{item.size || "\u2014"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.heatNo || "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.qtyOrdered).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.qtyDispatched).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(item.qtyBalance).toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.materialPrepared} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.inspectionStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.testingStatus} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.expectedDispatchDate || "\u2014"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {item.remarks || "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Email Order Status Report</DialogTitle>
            <DialogDescription>
              Send the status report with PDF attachment to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>To *</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>CC</Label>
              <Input
                type="email"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="manager@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Please find attached the current status of your order..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "text-muted-foreground";
  let Icon = Clock;
  if (status === "Completed" || status === "Ready") Icon = CheckCircle2;
  if (status === "Failed") Icon = AlertTriangle;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}
