"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileText,
  Mail,
  Check,
  X,
  Clock,
  Download,
  ChevronDown,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  SENT: "outline",
  WON: "default",
  LOST: "destructive",
};

export default function QuotationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
  });

  // Fetch quotation
  const { data, isLoading } = useQuery({
    queryKey: ["quotation", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch quotation");
      return res.json();
    },
  });

  // Update quotation mutation
  const updateMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/quotations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvalRemarks }),
      });
      if (!res.ok) throw new Error("Failed to update quotation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", params.id] });
      toast.success("Quotation updated successfully");
      setIsApprovalDialogOpen(false);
      setApprovalRemarks("");
    },
    onError: () => {
      toast.error("Failed to update quotation");
    },
  });

  const handleApprovalDialog = (action: "APPROVED" | "REJECTED") => {
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const handleApprove = () => {
    updateMutation.mutate(approvalAction);
  };

  const handleSubmitForApproval = () => {
    updateMutation.mutate("PENDING_APPROVAL");
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", params.id] });
      toast.success("Quotation sent successfully");
      setIsEmailDialogOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send email");
    },
  });

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async (variant?: string) => {
    try {
      setIsDownloading(true);
      const url = variant
        ? `/api/quotations/${params.id}/pdf?variant=${variant}`
        : `/api/quotations/${params.id}/pdf`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || "quotation.pdf";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      console.error("PDF download error:", error);
      toast.error(error.message || "Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenEmailDialog = () => {
    setEmailData({
      to: quotation?.customer?.email || "",
      cc: "",
      subject: `Quotation ${quotation?.quotationNo} - ${quotation?.customer?.name}`,
      message: "Please find attached our quotation for your reference. Should you have any queries, please feel free to contact us.",
    });
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!emailData.to) {
      toast.error("Please enter recipient email");
      return;
    }
    sendEmailMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading quotation...</div>
      </div>
    );
  }

  const quotation = data?.quotation;
  if (!quotation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Quotation not found</div>
      </div>
    );
  }

  const totalAmount = quotation.items.reduce(
    (sum: number, item: any) => sum + parseFloat(item.amount || 0),
    0
  );
  const totalWeight = quotation.items.reduce(
    (sum: number, item: any) => sum + parseFloat(item.totalWeightMT || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={quotation.quotationNo}
            description={`Quotation for ${quotation.customer.name}`}
          />
        </div>
        <Badge variant={statusColors[quotation.status] as any}>
          {quotation.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {quotation.status === "DRAFT" && (
          <Button onClick={handleSubmitForApproval}>
            <Clock className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        )}
        {quotation.status === "PENDING_APPROVAL" && (
          <>
            <Button onClick={() => handleApprovalDialog("APPROVED")}>
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApprovalDialog("REJECTED")}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        )}
        {(quotation.status === "APPROVED" || quotation.status === "SENT") && (
          <>
            <Button onClick={handleOpenEmailDialog}>
              <Mail className="h-4 w-4 mr-2" />
              Send to Customer
            </Button>
            {quotation.quotationCategory === "NON_STANDARD" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isDownloading}>
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? "Generating..." : "Download PDF"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDownloadPDF("commercial")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Commercial PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadPDF("technical")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Technical PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={() => handleDownloadPDF()} disabled={isDownloading}>
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Generating PDF..." : "Download PDF"}
              </Button>
            )}
            <Button
              variant="default"
              onClick={() =>
                router.push(`/sales/create?quotationId=${params.id}`)
              }
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Sales Order
            </Button>
          </>
        )}
      </div>

      {/* Quotation Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quotation Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Quotation No.</div>
              <div className="font-medium">{quotation.quotationNo}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {format(new Date(quotation.quotationDate), "dd MMM yyyy")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium">
                <Badge variant="outline">{quotation.quotationType}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Currency</div>
              <div className="font-medium">{quotation.currency}</div>
            </div>
            {quotation.validUpto && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Valid Until</div>
                <div className="font-medium">
                  {format(new Date(quotation.validUpto), "dd MMM yyyy")}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Version</div>
              <div className="font-medium">Rev.{quotation.version}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer & Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{quotation.customer.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Prepared By</div>
              <div className="font-medium">
                {quotation.preparedBy?.name || "—"}
              </div>
            </div>
            {quotation.approvedBy && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Approved By</div>
                  <div className="font-medium">{quotation.approvedBy.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Approval Date</div>
                  <div className="font-medium">
                    {format(new Date(quotation.approvalDate), "dd MMM yyyy")}
                  </div>
                </div>
              </>
            )}
            {quotation.enquiry && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Linked Enquiry</div>
                <div className="font-medium">
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.push(`/enquiries/${quotation.enquiry.id}`)}
                  >
                    {quotation.enquiry.enquiryNo}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>OD</TableHead>
                  <TableHead>WT</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Qty (Mtr)</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Weight (MT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">{item.product || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.material || "—"}
                    </TableCell>
                    <TableCell>{item.sizeLabel || "—"}</TableCell>
                    <TableCell>{item.od || "—"}</TableCell>
                    <TableCell>{item.wt || "—"}</TableCell>
                    <TableCell>{item.ends || "—"}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.unitRate).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {parseFloat(item.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalWeightMT
                        ? parseFloat(item.totalWeightMT).toFixed(4)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={9} className="text-right">
                    Total:
                  </TableCell>
                  <TableCell className="text-right">
                    {quotation.currency} {totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalWeight.toFixed(4)} MT
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      {quotation.terms && quotation.terms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Offer Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quotation.terms.map((term: any, index: number) => (
                <div key={term.id} className="flex gap-4">
                  <div className="font-medium min-w-[200px]">
                    {index + 1}. {term.termName}:
                  </div>
                  <div className="text-muted-foreground">{term.termValue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Quotation via Email</DialogTitle>
            <DialogDescription>
              Send this quotation as a PDF attachment to the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="to">To (Email) *</Label>
              <Input
                id="to"
                type="email"
                value={emailData.to}
                onChange={(e) =>
                  setEmailData({ ...emailData, to: e.target.value })
                }
                placeholder="customer@example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cc">CC (Email)</Label>
              <Input
                id="cc"
                type="email"
                value={emailData.cc}
                onChange={(e) =>
                  setEmailData({ ...emailData, cc: e.target.value })
                }
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData({ ...emailData, subject: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) =>
                  setEmailData({ ...emailData, message: e.target.value })
                }
                rows={6}
                placeholder="Email body message..."
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>The quotation will be attached as a PDF file.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "APPROVED" ? "Approve" : "Reject"} Quotation
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "APPROVED"
                ? "Approving this quotation will allow it to be sent to the customer."
                : "Rejecting this quotation will send it back to draft status."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows={4}
                placeholder="Add any comments or feedback..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={approvalAction === "REJECTED" ? "destructive" : "default"}
              onClick={handleApprove}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? "Processing..."
                : approvalAction === "APPROVED"
                ? "Approve Quotation"
                : "Reject Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
