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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  GitBranch,
  History,
  Calculator,
  ArrowRightLeft,
  Ban,
  Pencil,
  Trash2,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  REVISED: "secondary",
  SENT: "outline",
  WON: "default",
  LOST: "destructive",
  EXPIRED: "secondary",
  SUPERSEDED: "secondary",
  CANCELLED: "destructive",
};

const REVISION_TRIGGERS = [
  { code: "PRICE_NEGOTIATION", label: "Customer requests price reduction" },
  { code: "SPEC_CHANGE", label: "Customer changes specifications" },
  { code: "QTY_CHANGE", label: "Customer changes quantities" },
  { code: "ITEM_ADD", label: "Customer adds new items" },
  { code: "ITEM_REMOVE", label: "Customer removes items" },
  { code: "VALIDITY_EXTENSION", label: "Validity extension only" },
  { code: "DELIVERY_CHANGE", label: "Delivery schedule change" },
  { code: "TERMS_CHANGE", label: "Payment/delivery terms change" },
  { code: "SCOPE_CHANGE", label: "Scope of supply change" },
  { code: "FOREX_CHANGE", label: "Currency/forex rate change" },
  { code: "VENDOR_COST_CHANGE", label: "Vendor cost revision" },
  { code: "MARKET_ADJUSTMENT", label: "Market price adjustment" },
  { code: "COMPETITIVE_RESPONSE", label: "Competitive response" },
  { code: "REGULATORY_CHANGE", label: "Regulatory/compliance change" },
  { code: "CUSTOMER_PO_MISMATCH", label: "Customer PO mismatch correction" },
  { code: "INTERNAL_CORRECTION", label: "Internal error correction" },
  { code: "RE_QUOTATION_AFTER_EXPIRY", label: "Re-quotation after expiry" },
  { code: "OTHER", label: "Other" },
];

const LOSS_REASONS = [
  { code: "PRICE_TOO_HIGH", label: "Price too high" },
  { code: "DELIVERY_TOO_LONG", label: "Delivery timeline too long" },
  { code: "SPEC_NOT_MET", label: "Specification not met" },
  { code: "COMPETITOR_WON", label: "Competitor won the order" },
  { code: "CUSTOMER_CANCELLED", label: "Customer cancelled the project" },
  { code: "BUDGET_CONSTRAINTS", label: "Customer budget constraints" },
  { code: "NO_RESPONSE", label: "No response from customer" },
  { code: "OTHER", label: "Other" },
];

// Statuses that allow revision
const REVISABLE_STATUSES = ["APPROVED", "SENT", "REJECTED", "EXPIRED", "LOST"];

export default function QuotationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
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
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false);
  const [revisionData, setRevisionData] = useState({
    revisionTrigger: "",
    revisionSubReason: "",
    revisionNotes: "",
    customerReference: "",
  });
  const [isLossDialogOpen, setIsLossDialogOpen] = useState(false);
  const [lossData, setLossData] = useState({
    lossReason: "",
    lossCompetitor: "",
    lossNotes: "",
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

  // Fetch email logs
  const { data: emailLogsData } = useQuery({
    queryKey: ["quotation-emails", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}/emails`);
      if (!res.ok) throw new Error("Failed to fetch email logs");
      return res.json();
    },
  });

  // Fetch activity trail
  const { data: activityData } = useQuery({
    queryKey: ["quotation-activity", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}/activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  });

  // Update quotation mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await fetch(`/api/quotations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update quotation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", params.id] });
      queryClient.invalidateQueries({ queryKey: ["quotation-activity", params.id] });
      toast.success("Quotation updated successfully");
      setIsApprovalDialogOpen(false);
      setIsLossDialogOpen(false);
      setApprovalRemarks("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update quotation");
    },
  });

  const handleApprovalDialog = (action: "APPROVED" | "REJECTED") => {
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const handleApprove = () => {
    updateMutation.mutate({ status: approvalAction, approvalRemarks });
  };

  const handleSubmitForApproval = () => {
    updateMutation.mutate({ status: "PENDING_APPROVAL" });
  };

  const handleMarkAsLost = () => {
    if (!lossData.lossReason) {
      toast.error("Please select a loss reason");
      return;
    }
    updateMutation.mutate({
      status: "LOST",
      lossReason: lossData.lossReason,
      lossCompetitor: lossData.lossCompetitor,
      lossNotes: lossData.lossNotes,
    });
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
      queryClient.invalidateQueries({ queryKey: ["quotation-emails", params.id] });
      queryClient.invalidateQueries({ queryKey: ["quotation-activity", params.id] });
      toast.success("Quotation sent successfully");
      setIsEmailDialogOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send email");
    },
  });

  // Revise quotation mutation
  const reviseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revisionData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create revision");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Revision Rev.${data.quotation.version} created`);
      setIsReviseDialogOpen(false);
      setRevisionData({ revisionTrigger: "", revisionSubReason: "", revisionNotes: "", customerReference: "" });
      router.push(`/quotations/${data.quotation.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create revision");
    },
  });

  // Delete quotation mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/quotations/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete quotation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Quotation deleted");
      router.push("/quotations");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete quotation");
    },
  });

  const handleDownloadPDF = (variant?: string) => {
    const variantParam = variant ? `&variant=${variant}` : "";
    window.open(`/api/quotations/${params.id}/pdf?format=html${variantParam}`, "_blank");
  };

  const handleOpenEmailDialog = () => {
    const quotation = data?.quotation;
    const isRevision = quotation?.version > 0;
    setEmailData({
      to: quotation?.customer?.email || "",
      cc: "",
      subject: isRevision
        ? `Revised Quotation ${quotation?.quotationNo} Rev.${quotation?.version} - ${quotation?.customer?.name}`
        : `Quotation ${quotation?.quotationNo} - ${quotation?.customer?.name}`,
      message: isRevision
        ? "Please find attached our revised quotation for your reference. This quotation supersedes all previous revisions. Should you have any queries, please feel free to contact us."
        : "Please find attached our quotation for your reference. Should you have any queries, please feel free to contact us.",
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

  const handleReviseDialog = () => {
    setRevisionData({ revisionTrigger: "", revisionSubReason: "", revisionNotes: "", customerReference: "" });
    setIsReviseDialogOpen(true);
  };

  const handleCreateRevision = () => {
    if (!revisionData.revisionTrigger) {
      toast.error("Please select a revision trigger");
      return;
    }
    if (revisionData.revisionTrigger === "OTHER" && !revisionData.revisionSubReason) {
      toast.error("Please provide a sub-reason for 'Other' trigger");
      return;
    }
    reviseMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading quotation...</div>
      </div>
    );
  }

  const quotation = data?.quotation;
  const revisionChain = data?.revisionChain || [];
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

  const canRevise = REVISABLE_STATUSES.includes(quotation.status);
  const isTerminal = ["WON", "SUPERSEDED", "CANCELLED"].includes(quotation.status);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={`${quotation.quotationNo}${quotation.version > 0 ? ` Rev.${quotation.version}` : ""}`}
            description={`Quotation for ${quotation.customer.name}`}
          />
        </div>
        <Badge variant={statusColors[quotation.status] as any}>
          {quotation.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {quotation.status === "DRAFT" && (
          <>
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/quotations/create/${quotation.quotationCategory === "NON_STANDARD" ? "nonstandard" : "standard"}?editId=${quotation.id}`
                )
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleSubmitForApproval}>
              <Clock className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                if (confirm("Are you sure you want to delete this draft quotation?")) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        {quotation.status === "PENDING_APPROVAL" && (user?.role === "MANAGEMENT" || user?.role === "ADMIN") && (
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
              {quotation.status === "SENT" ? "Resend" : "Send to Customer"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDownloadPDF("quoted")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Quoted PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPDF("unquoted")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Unquoted PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {quotation.status === "SENT" && (
              <Button
                variant="default"
                onClick={() =>
                  router.push(`/sales/create?quotationId=${params.id}`)
                }
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create Sales Order
              </Button>
            )}
          </>
        )}
        {quotation.status === "SENT" && (
          <Button
            variant="outline"
            onClick={() => {
              setLossData({ lossReason: "", lossCompetitor: "", lossNotes: "" });
              setIsLossDialogOpen(true);
            }}
          >
            <Ban className="h-4 w-4 mr-2" />
            Mark as Lost
          </Button>
        )}
        {canRevise && (
          <Button
            variant="outline"
            onClick={handleReviseDialog}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Revise
          </Button>
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
              <div className="text-sm text-muted-foreground">Revision</div>
              <div className="font-medium">Rev.{quotation.version}</div>
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
              <div className="text-sm text-muted-foreground">Category</div>
              <div className="font-medium">
                <Badge variant="outline">{quotation.quotationCategory}</Badge>
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
            {quotation.inquiryNo && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Inquiry No.</div>
                <div className="font-medium">{quotation.inquiryNo}</div>
              </div>
            )}
            {quotation.inquiryDate && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Inquiry Date</div>
                <div className="font-medium">
                  {format(new Date(quotation.inquiryDate), "dd MMM yyyy")}
                </div>
              </div>
            )}
            {quotation.revisionTrigger && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Revision Reason</div>
                <div className="font-medium">
                  {REVISION_TRIGGERS.find((t) => t.code === quotation.revisionTrigger)?.label || quotation.revisionTrigger}
                </div>
              </div>
            )}
            {quotation.revisionNotes && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Revision Notes</div>
                <div className="font-medium text-sm">{quotation.revisionNotes}</div>
              </div>
            )}
            {quotation.kindAttention && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Kind Attention</div>
                <div className="font-medium text-sm">{quotation.kindAttention}</div>
              </div>
            )}
            {(quotation.placeOfSupplyCity || quotation.placeOfSupplyState) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Place of Supply</div>
                <div className="font-medium text-sm">
                  {[quotation.placeOfSupplyCity, quotation.placeOfSupplyState, quotation.placeOfSupplyCountry]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}
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
            {quotation.buyer && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Buyer</div>
                <div className="font-medium">{quotation.buyer.buyerName}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Prepared By</div>
              <div className="font-medium">
                {quotation.preparedBy?.name || "---"}
              </div>
            </div>
            {quotation.dealOwner && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Deal Owner</div>
                <div className="font-medium">{quotation.dealOwner.name}</div>
              </div>
            )}
            {quotation.nextActionDate && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Next Action Date</div>
                <div className={`font-medium ${new Date(quotation.nextActionDate) < new Date() ? "text-destructive" : ""}`}>
                  {format(new Date(quotation.nextActionDate), "dd MMM yyyy")}
                </div>
              </div>
            )}
            {quotation.salesOrders?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">OC Created</div>
                <div className="font-medium text-green-600">
                  {quotation.salesOrders.map((so: any) => so.soNo).join(", ")}
                </div>
              </div>
            )}
            {quotation.approvedBy && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">
                    {quotation.status === "REJECTED" ? "Rejected By" : "Approved By"}
                  </div>
                  <div className="font-medium">{quotation.approvedBy.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">
                    {quotation.status === "REJECTED" ? "Rejection" : "Approval"} Date
                  </div>
                  <div className="font-medium">
                    {format(new Date(quotation.approvalDate), "dd MMM yyyy")}
                  </div>
                </div>
                {quotation.approvalRemarks && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Remarks</div>
                    <div className="font-medium text-sm">{quotation.approvalRemarks}</div>
                  </div>
                )}
              </>
            )}
            {quotation.sentDate && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Sent Date</div>
                <div className="font-medium">
                  {format(new Date(quotation.sentDate), "dd MMM yyyy")}
                </div>
              </div>
            )}
            {quotation.lossReason && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Loss Reason</div>
                  <div className="font-medium text-red-600">
                    {LOSS_REASONS.find((r) => r.code === quotation.lossReason)?.label || quotation.lossReason}
                  </div>
                </div>
                {quotation.lossCompetitor && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Competitor</div>
                    <div className="font-medium">{quotation.lossCompetitor}</div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      {(quotation.subtotal || quotation.grandTotal) && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="space-y-2 text-sm w-full max-w-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {quotation.currency} {parseFloat(quotation.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {quotation.additionalDiscount && parseFloat(quotation.additionalDiscount) > 0 && (
                  <>
                    <div className="flex justify-between py-1 text-orange-600">
                      <span>Discount ({parseFloat(quotation.additionalDiscount)}%)</span>
                      <span>− {quotation.currency} {parseFloat(quotation.discountAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">After Discount</span>
                      <span className="font-medium">
                        {quotation.currency} {parseFloat(quotation.totalAfterDiscount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
                {quotation.taxRate && parseFloat(quotation.taxRate) > 0 && !quotation.rcmEnabled && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">GST ({parseFloat(quotation.taxRate)}%)</span>
                    <span>{quotation.currency} {parseFloat(quotation.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {quotation.rcmEnabled && (
                  <div className="flex justify-between py-1 text-amber-600">
                    <span>Tax — RCM (paid by buyer)</span>
                    <span>₹0.00</span>
                  </div>
                )}
                {quotation.roundOff && quotation.roundOffAmount != null && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Round-off</span>
                    <span>{parseFloat(quotation.roundOffAmount) >= 0 ? "+" : ""}{parseFloat(quotation.roundOffAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t font-bold text-base">
                  <span>Grand Total</span>
                  <span>
                    {quotation.currency} {parseFloat(quotation.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {quotation.advanceToPay && parseFloat(quotation.advanceToPay) > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Advance to Pay</span>
                    <span>{quotation.currency} {parseFloat(quotation.advanceToPay).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
            {quotation.amountInWords && (
              <div className="mt-3 text-right text-sm text-muted-foreground italic">
                {quotation.amountInWords}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
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
                    <TableCell className="font-medium">{item.product || "---"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.material || "---"}
                    </TableCell>
                    <TableCell>{item.sizeLabel || "---"}</TableCell>
                    <TableCell>{item.od || "---"}</TableCell>
                    <TableCell>{item.wt || "---"}</TableCell>
                    <TableCell>{item.ends || "---"}</TableCell>
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
                        : "---"}
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


      {/* Revision History */}
      {revisionChain.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Revision History ({revisionChain.length} revisions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revision</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Prepared By</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisionChain.map((rev: any) => {
                    const isCurrent = rev.id === quotation.id;
                    return (
                      <TableRow key={rev.id} className={isCurrent ? "bg-muted/50" : ""}>
                        <TableCell className="font-semibold">
                          Rev.{rev.version} {isCurrent && "(Current)"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(rev.quotationDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[rev.status] as any}>
                            {rev.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {rev.revisionTrigger
                            ? REVISION_TRIGGERS.find((t) => t.code === rev.revisionTrigger)?.label || rev.revisionTrigger
                            : rev.version === 0 ? "Original" : "---"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rev.grandTotal
                            ? parseFloat(rev.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                            : "---"}
                        </TableCell>
                        <TableCell>{rev.preparedBy?.name || "---"}</TableCell>
                        <TableCell>
                          {rev.sentDate
                            ? format(new Date(rev.sentDate), "dd MMM yyyy")
                            : "---"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!isCurrent && (
                              <Button
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() => router.push(`/quotations/${rev.id}`)}
                              >
                                View
                              </Button>
                            )}
                            {rev.version > 0 && (
                              <Button
                                variant="link"
                                className="p-0 h-auto ml-2"
                                onClick={() => router.push(`/quotations/${rev.id}/compare`)}
                              >
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                Compare
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal Costing Analysis - MANAGEMENT and ADMIN only */}
      {(user?.role === "MANAGEMENT" || user?.role === "ADMIN") &&
        quotation.items.some(
          (item: any) =>
            item.materialCost || item.logisticsCost || item.inspectionCost || item.otherCosts
        ) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Costing Analysis
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  Internal Only
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Material Cost</TableHead>
                      <TableHead className="text-right">Logistics Cost</TableHead>
                      <TableHead className="text-right">Inspection Cost</TableHead>
                      <TableHead className="text-right">Other Costs</TableHead>
                      <TableHead className="text-right">Total Cost/Unit</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Margin Amt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.items.map((item: any) => {
                      const totalCost = parseFloat(item.totalCostPerUnit || 0);
                      const unitRate = parseFloat(item.unitRate || 0);
                      const qty = parseFloat(item.quantity || 0);
                      const marginAmt = (unitRate - totalCost) * qty;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.sNo}</TableCell>
                          <TableCell className="font-medium">{item.product || "---"}</TableCell>
                          <TableCell>{item.sizeLabel || "---"}</TableCell>
                          <TableCell className="text-right">
                            {item.materialCost ? parseFloat(item.materialCost).toFixed(2) : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.logisticsCost ? parseFloat(item.logisticsCost).toFixed(2) : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.inspectionCost ? parseFloat(item.inspectionCost).toFixed(2) : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.otherCosts ? parseFloat(item.otherCosts).toFixed(2) : "---"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {totalCost > 0 ? totalCost.toFixed(2) : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.marginPercentage
                              ? parseFloat(item.marginPercentage).toFixed(2) + "%"
                              : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {unitRate.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {qty.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {totalCost > 0 ? marginAmt.toFixed(2) : "---"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Costing Summary */}
              {(() => {
                const itemsWithCosting = quotation.items.filter(
                  (item: any) => parseFloat(item.totalCostPerUnit || 0) > 0
                );
                if (itemsWithCosting.length === 0) return null;

                const grandTotalCost = itemsWithCosting.reduce(
                  (sum: number, item: any) =>
                    sum + parseFloat(item.totalCostPerUnit || 0) * parseFloat(item.quantity || 0),
                  0
                );
                const grandTotalSelling = itemsWithCosting.reduce(
                  (sum: number, item: any) =>
                    sum + parseFloat(item.unitRate || 0) * parseFloat(item.quantity || 0),
                  0
                );
                const grandMarginAmt = grandTotalSelling - grandTotalCost;
                const overallMarginPct =
                  grandTotalCost > 0 ? ((grandMarginAmt / grandTotalCost) * 100) : 0;

                return (
                  <div className="mt-4 flex justify-end gap-8 pt-4 border-t">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-lg font-bold">
                        {quotation.currency} {grandTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Margin</div>
                      <div className="text-lg font-bold text-green-600">
                        {quotation.currency} {grandMarginAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Overall Margin %</div>
                      <div className="text-lg font-bold text-green-600">
                        {overallMarginPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

      {/* Activity & Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity & Communication History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">
                <History className="h-4 w-4 mr-1" />
                Activity Trail
              </TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4 mr-1" />
                Email Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              {activityData?.activities?.length > 0 ? (
                <div className="space-y-3">
                  {activityData.activities.map((act: any) => {
                    const actionColors: Record<string, string> = {
                      CREATE: "bg-green-100 text-green-800",
                      APPROVE: "bg-blue-100 text-blue-800",
                      REJECT: "bg-red-100 text-red-800",
                      SUBMIT_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
                      STATUS_CHANGE: "bg-purple-100 text-purple-800",
                      EMAIL_SENT: "bg-cyan-100 text-cyan-800",
                      UPDATE: "bg-gray-100 text-gray-800",
                      DELETE: "bg-red-100 text-red-800",
                    };
                    let parsedNew: any = null;
                    try {
                      parsedNew = act.newValue ? JSON.parse(act.newValue) : null;
                    } catch {
                      parsedNew = act.newValue;
                    }
                    return (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColors[act.action] || "bg-gray-100 text-gray-800"}`}
                          >
                            {act.action.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{act.user?.name || "System"}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(act.timestamp), "dd MMM yyyy, HH:mm")}
                            </span>
                          </div>
                          {act.oldValue && act.fieldName === "status" && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {act.oldValue} → {typeof parsedNew === "object" && parsedNew?.status ? parsedNew.status : (parsedNew || "")}
                            </div>
                          )}
                          {typeof parsedNew === "object" && parsedNew?.remarks && (
                            <div className="text-sm text-muted-foreground mt-1 italic">
                              {"\u201C"}{parsedNew.remarks}{"\u201D"}
                            </div>
                          )}
                          {typeof parsedNew === "object" && parsedNew?.to && (
                            <div className="text-sm text-muted-foreground mt-1">
                              To: {parsedNew.to}
                              {parsedNew.cc && ` | CC: ${parsedNew.cc}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No activity recorded yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              {emailLogsData?.emailLogs?.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>CC</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Sent By</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogsData.emailLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.sentAt), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{log.sentTo}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{log.sentCc || "---"}</TableCell>
                          <TableCell className="max-w-[250px] truncate">{log.subject}</TableCell>
                          <TableCell>{log.sentBy?.name || "---"}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No emails sent yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Revision Initiation Dialog */}
      <Dialog open={isReviseDialogOpen} onOpenChange={setIsReviseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Quotation Revision</DialogTitle>
            <DialogDescription>
              This will create Rev.{quotation.version + 1} of {quotation.quotationNo}, copying all items and terms from the current revision.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Revision Trigger *</Label>
              <Select
                value={revisionData.revisionTrigger}
                onValueChange={(val) => setRevisionData({ ...revisionData, revisionTrigger: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select revision reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REVISION_TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger.code} value={trigger.code}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {revisionData.revisionTrigger === "OTHER" && (
              <div className="grid gap-2">
                <Label>Sub-Reason *</Label>
                <Input
                  value={revisionData.revisionSubReason}
                  onChange={(e) => setRevisionData({ ...revisionData, revisionSubReason: e.target.value })}
                  placeholder="Specify reason..."
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Customer Reference</Label>
              <Input
                value={revisionData.customerReference}
                onChange={(e) => setRevisionData({ ...revisionData, customerReference: e.target.value })}
                placeholder="Customer's email/letter/PO reference..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={revisionData.revisionNotes}
                onChange={(e) => setRevisionData({ ...revisionData, revisionNotes: e.target.value })}
                rows={3}
                placeholder="Internal notes (not visible to customer)..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRevision} disabled={reviseMutation.isPending}>
              <GitBranch className="h-4 w-4 mr-2" />
              {reviseMutation.isPending ? "Creating..." : "Create Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loss Tracking Dialog */}
      <Dialog open={isLossDialogOpen} onOpenChange={setIsLossDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Quotation as Lost</DialogTitle>
            <DialogDescription>
              Record why this quotation was lost. This information helps improve future quotations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Loss Reason *</Label>
              <Select
                value={lossData.lossReason}
                onValueChange={(val) => setLossData({ ...lossData, lossReason: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loss reason..." />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((reason) => (
                    <SelectItem key={reason.code} value={reason.code}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lossData.lossReason === "COMPETITOR_WON" && (
              <div className="grid gap-2">
                <Label>Competitor Name</Label>
                <Input
                  value={lossData.lossCompetitor}
                  onChange={(e) => setLossData({ ...lossData, lossCompetitor: e.target.value })}
                  placeholder="Competitor company name..."
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={lossData.lossNotes}
                onChange={(e) => setLossData({ ...lossData, lossNotes: e.target.value })}
                rows={3}
                placeholder="Additional details..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLossDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMarkAsLost} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Processing..." : "Mark as Lost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Quotation via Email</DialogTitle>
            <DialogDescription>
              Send this quotation as a PDF attachment to the customer.
              {quotation.version > 0 && " This is a revised quotation."}
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
                : "Rejecting this quotation will require re-submission."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">
                Remarks {approvalAction === "REJECTED" ? "*" : "(Optional)"}
              </Label>
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
