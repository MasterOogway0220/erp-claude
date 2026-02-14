"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageLoading } from "@/components/shared/page-loading";

interface PO {
  id: string;
  poNo: string;
  poDate: string;
  vendor: {
    id: string;
    name: string;
    address: string;
    city?: string;
  };
  salesOrder?: {
    id: string;
    soNo: string;
  };
  purchaseRequisition?: {
    id: string;
    prNo: string;
  };
  version: number;
  deliveryDate?: string;
  specialRequirements?: string;
  status: string;
  totalAmount: number;
  currency: string;
  approvedById?: string;
  approvalDate?: string;
  approvalRemarks?: string;
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    sNo: number;
    product: string;
    material: string;
    additionalSpec?: string;
    sizeLabel: string;
    quantity: number;
    unitRate: number;
    amount: number;
    deliveryDate?: string;
  }>;
  goodsReceiptNotes?: Array<{
    id: string;
    grnNo: string;
    grnDate: string;
  }>;
  parentPo?: {
    id: string;
    poNo: string;
    version: number;
  };
  childPos?: Array<{
    id: string;
    poNo: string;
    version: number;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const poStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-orange-500",
  APPROVED: "bg-blue-500",
  OPEN: "bg-green-500",
  SENT_TO_VENDOR: "bg-indigo-500",
  PARTIALLY_RECEIVED: "bg-yellow-500",
  FULLY_RECEIVED: "bg-purple-500",
  CLOSED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useCurrentUser();
  const [po, setPO] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [amendmentData, setAmendmentData] = useState({
    deliveryDate: "",
    specialRequirements: "",
    changeReason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPO(params.id as string);
    }
  }, [params.id]);

  const fetchPO = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase/orders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPO(data.purchaseOrder);
      setAmendmentData({
        deliveryDate: data.purchaseOrder.deliveryDate
          ? format(new Date(data.purchaseOrder.deliveryDate), "yyyy-MM-dd")
          : "",
        specialRequirements: data.purchaseOrder.specialRequirements || "",
        changeReason: "",
      });
    } catch (error) {
      toast.error("Failed to load purchase order");
      router.push("/purchase");
    } finally {
      setLoading(false);
    }
  };

  const handleAmendPO = async () => {
    if (!po) return;

    if (!amendmentData.changeReason) {
      toast.error("Please provide a reason for the amendment");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/purchase/orders/${po.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: amendmentData.deliveryDate,
          specialRequirements: amendmentData.specialRequirements,
          changeReason: amendmentData.changeReason,
          items: po.items.map((item) => ({
            product: item.product,
            material: item.material,
            additionalSpec: item.additionalSpec,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            unitRate: item.unitRate,
            amount: item.amount,
            deliveryDate: item.deliveryDate,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create amendment");
      }

      const data = await response.json();
      toast.success(`PO Amendment Rev.${data.version} created successfully`);
      setAmendDialogOpen(false);
      router.push(`/purchase/orders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async (action: string, remarks?: string) => {
    if (!po) return;
    setSubmitting(true);
    try {
      const payload: any = { action };
      // Use provided remarks (for rejection dialog) or the approvalRemarks state (for approve)
      if (remarks !== undefined) {
        payload.approvalRemarks = remarks;
      } else if (approvalRemarks) {
        payload.approvalRemarks = approvalRemarks;
      }

      const response = await fetch(`/api/purchase/orders/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action}`);
      }
      const labels: Record<string, string> = {
        submit_for_approval: "Submitted for approval",
        approve: "Purchase Order approved",
        reject: "Purchase Order rejected and reverted to Draft",
        send_to_vendor: "Sent to vendor",
      };
      toast.success(labels[action] || "Updated");
      setApprovalRemarks("");
      setRejectionRemarks("");
      setRejectDialogOpen(false);
      fetchPO(po.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!rejectionRemarks.trim()) {
      toast.error("Remarks are required when rejecting a Purchase Order");
      return;
    }
    handleApprovalAction("reject", rejectionRemarks);
  };

  const canApprove = user?.role === "MANAGEMENT" || user?.role === "ADMIN";
  const canSubmitForApproval = user?.role === "PURCHASE" || user?.role === "ADMIN" || user?.role === "MANAGEMENT";

  if (loading) {
    return <PageLoading />;
  }

  if (!po) {
    return null;
  }

  const isOverdue =
    po.deliveryDate &&
    po.status !== "FULLY_RECEIVED" &&
    po.status !== "CLOSED" &&
    differenceInDays(new Date(), new Date(po.deliveryDate)) > 0;

  const daysOverdue = isOverdue
    ? differenceInDays(new Date(), new Date(po.deliveryDate!))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase Order: ${po.poNo}`}
        description={
          po.version > 0
            ? `Revision ${po.version} | Created on ${format(
                new Date(po.poDate),
                "dd MMM yyyy"
              )}`
            : `Created on ${format(new Date(po.poDate), "dd MMM yyyy")}`
        }
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {po.status !== "CLOSED" && po.status !== "CANCELLED" && (
            <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Amend PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create PO Amendment</DialogTitle>
                  <DialogDescription>
                    Create a new revision of this purchase order (Rev.{po.version + 1})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={amendmentData.deliveryDate}
                      onChange={(e) =>
                        setAmendmentData({
                          ...amendmentData,
                          deliveryDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialRequirements">Special Requirements</Label>
                    <Textarea
                      id="specialRequirements"
                      value={amendmentData.specialRequirements}
                      onChange={(e) =>
                        setAmendmentData({
                          ...amendmentData,
                          specialRequirements: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="changeReason">Reason for Amendment *</Label>
                    <Textarea
                      id="changeReason"
                      value={amendmentData.changeReason}
                      onChange={(e) =>
                        setAmendmentData({
                          ...amendmentData,
                          changeReason: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Explain why this amendment is needed..."
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setAmendDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAmendPO} disabled={submitting}>
                      Create Amendment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      {isOverdue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Delivery Overdue</h3>
                <p className="text-sm text-red-700 mt-1">
                  Expected delivery was {format(new Date(po.deliveryDate!), "dd MMM yyyy")}.
                  Currently {daysOverdue} day(s) overdue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow Section */}
      {po.status === "DRAFT" && canSubmitForApproval && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">PO is in Draft</h3>
                <p className="text-sm text-blue-700 mt-1">Submit this PO for management approval before sending to vendor.</p>
                {po.approvalRemarks && !po.approvedBy && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <span className="font-medium">Previous rejection reason:</span> {po.approvalRemarks}
                  </div>
                )}
              </div>
              <Button onClick={() => handleApprovalAction("submit_for_approval")} disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {po.status === "PENDING_APPROVAL" && canApprove && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-medium text-orange-900">Pending Approval</h3>
              <p className="text-sm text-orange-700 mt-1">This PO requires management approval.</p>
            </div>
            <div className="space-y-2">
              <Label>Approval Remarks (optional)</Label>
              <Textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Optional remarks for approval..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleApprovalAction("approve")} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                <ThumbsUp className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" disabled={submitting}>
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Purchase Order</DialogTitle>
                    <DialogDescription>
                      This PO will be reverted to DRAFT status. Please provide a reason for rejection.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rejectionRemarks">Rejection Remarks *</Label>
                      <Textarea
                        id="rejectionRemarks"
                        value={rejectionRemarks}
                        onChange={(e) => setRejectionRemarks(e.target.value)}
                        placeholder="Explain why this PO is being rejected..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionRemarks(""); }}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleReject} disabled={submitting || !rejectionRemarks.trim()}>
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {po.status === "PENDING_APPROVAL" && !canApprove && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900">Awaiting Approval</h3>
                <p className="text-sm text-orange-700 mt-1">This PO is pending management approval.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {po.status === "OPEN" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">PO Approved</h3>
                <p className="text-sm text-green-700 mt-1">This PO has been approved. You can now send it to the vendor.</p>
              </div>
              <Button onClick={() => handleApprovalAction("send_to_vendor")} disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent to Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Purchase Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">PO Number</div>
                <div className="font-mono font-medium">
                  {po.poNo}
                  {po.version > 0 && (
                    <Badge variant="outline" className="ml-2">
                      Rev.{po.version}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PO Date</div>
                <div>{format(new Date(po.poDate), "dd MMM yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge className={poStatusColors[po.status]}>
                  {po.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Currency</div>
                <div>{po.currency}</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {po.purchaseRequisition && (
                <div>
                  <div className="text-sm text-muted-foreground">PR Reference</div>
                  <div className="font-mono">{po.purchaseRequisition.prNo}</div>
                </div>
              )}
              {po.salesOrder && (
                <div>
                  <div className="text-sm text-muted-foreground">SO Reference</div>
                  <div className="font-mono">{po.salesOrder.soNo}</div>
                </div>
              )}
            </div>

            {po.deliveryDate && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Expected Delivery</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(po.deliveryDate), "dd MMM yyyy")}
                  </div>
                </div>
                {po.goodsReceiptNotes && po.goodsReceiptNotes.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Actual Delivery</div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {format(
                        new Date(po.goodsReceiptNotes[0].grnDate),
                        "dd MMM yyyy"
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {po.specialRequirements && (
              <div>
                <div className="text-sm text-muted-foreground">Special Requirements</div>
                <div className="text-sm mt-1">{po.specialRequirements}</div>
              </div>
            )}

            {/* Approval Information */}
            {(po.approvedBy || po.approvalRemarks) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-3">Approval Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {po.approvedBy && (
                      <div>
                        <div className="text-sm text-muted-foreground">Approved By</div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {po.approvedBy.name}
                        </div>
                      </div>
                    )}
                    {po.approvalDate && (
                      <div>
                        <div className="text-sm text-muted-foreground">Approval Date</div>
                        <div>{format(new Date(po.approvalDate), "dd MMM yyyy, HH:mm")}</div>
                      </div>
                    )}
                    {po.approvalRemarks && (
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground">
                          {po.status === "DRAFT" && !po.approvedBy ? "Rejection Remarks" : "Approval Remarks"}
                        </div>
                        <div className="text-sm mt-1 p-2 bg-muted rounded">{po.approvalRemarks}</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm text-muted-foreground">Vendor City</div>
              <div>{po.vendor.city || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Vendor Name</div>
              <div className="font-medium">{po.vendor.name}</div>
            </div>
            {po.vendor.address && (
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="text-sm">{po.vendor.address}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="history">
            Amendment History
            {po.childPos && po.childPos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {po.childPos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.sNo}</TableCell>
                      <TableCell className="font-medium">{item.product}</TableCell>
                      <TableCell>{item.material}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.sizeLabel}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.quantity).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {po.currency} {Number(item.unitRate).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {po.currency} {Number(item.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.deliveryDate
                          ? format(new Date(item.deliveryDate), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-2xl font-bold">
                    {po.currency} {Number(po.totalAmount).toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {po.parentPo && (
                <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <FileText className="w-4 h-4" />
                    This is an amendment of{" "}
                    <button
                      onClick={() => router.push(`/purchase/orders/${po.parentPo!.id}`)}
                      className="font-mono font-medium underline"
                    >
                      {po.parentPo.poNo} (Rev.{po.parentPo.version})
                    </button>
                  </div>
                </div>
              )}

              {po.childPos && po.childPos.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-medium mb-4">Amendment History</h3>
                  {po.childPos.map((amendment) => (
                    <div
                      key={amendment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/purchase/orders/${amendment.id}`)}
                    >
                      <div>
                        <div className="font-mono font-medium">
                          {amendment.poNo} - Rev.{amendment.version}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created on{" "}
                          {format(new Date(amendment.createdAt), "dd MMM yyyy HH:mm")}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No amendments yet</p>
                  <p className="text-sm mt-2">This is the original PO (Rev.{po.version})</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
