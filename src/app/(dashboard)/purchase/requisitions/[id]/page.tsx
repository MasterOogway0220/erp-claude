"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Send, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  PO_CREATED: "bg-blue-500",
};

export default function PRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  useEffect(() => {
    fetchPR();
  }, [id]);

  const fetchPR = async () => {
    try {
      const response = await fetch(`/api/purchase/requisitions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPr(data.purchaseRequisition);
      } else {
        toast.error("Failed to load purchase requisition");
        router.push("/purchase");
      }
    } catch (error) {
      toast.error("Failed to load purchase requisition");
    } finally {
      setLoading(false);
    }
  };

  const isApprover = user?.role === "MANAGEMENT" || user?.role === "ADMIN";

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/purchase/requisitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(approvalRemarks && { approvalRemarks }),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPr(data.purchaseRequisition);
        toast.success(`PR status updated to ${newStatus.replace(/_/g, " ")}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!pr) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pr.prNo}
        description="Purchase Requisition Details"
      >
        <div className="flex items-center gap-2">
          <Badge className={statusColors[pr.status] || "bg-gray-500"}>
            {pr.status.replace(/_/g, " ")}
          </Badge>
          <Button variant="outline" onClick={() => router.push("/purchase")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PR Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">PR Date</p>
                <p className="font-medium">
                  {format(new Date(pr.prDate), "dd MMM yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Required By</p>
                <p className="font-medium">
                  {pr.requiredByDate
                    ? format(new Date(pr.requiredByDate), "dd MMM yyyy")
                    : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SO Reference</p>
                <p className="font-medium">
                  {pr.salesOrder ? (
                    <Link
                      href={`/sales/${pr.salesOrder.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {pr.salesOrder.soNo}
                    </Link>
                  ) : (
                    "Manual"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suggested Vendor</p>
                <p className="font-medium">
                  {pr.suggestedVendor?.name || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Requested By</p>
                <p className="font-medium">
                  {pr.requestedBy?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium">
                  {pr.approvedBy?.name || "Pending"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval Date</p>
                <p className="font-medium">
                  {pr.approvalDate
                    ? format(new Date(pr.approvalDate), "dd MMM yyyy")
                    : "Pending"}
                </p>
              </div>
              {pr.approvalRemarks && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Approval Remarks</p>
                  <p className="font-medium">{pr.approvalRemarks}</p>
                </div>
              )}
            </div>

            {/* Linked POs */}
            {pr.purchaseOrders?.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Linked Purchase Orders
                </p>
                <div className="flex flex-wrap gap-2">
                  {pr.purchaseOrders.map((po: any) => (
                    <Link key={po.id} href={`/purchase/orders/${po.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                        {po.poNo}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Line Items ({pr.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">
                      {item.product || "—"}
                    </TableCell>
                    <TableCell>{item.material || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.sizeLabel || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell>{item.uom || "MTR"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {pr.status === "DRAFT" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={updating}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Approval
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit for Approval</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will submit PR {pr.prNo} for approval. Continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => updateStatus("PENDING_APPROVAL")}
                    >
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {pr.status === "PENDING_APPROVAL" && isApprover && (
              <>
                <div className="w-full space-y-2 mb-2">
                  <Label htmlFor="approvalRemarks">Remarks (Optional)</Label>
                  <Textarea
                    id="approvalRemarks"
                    placeholder="Add remarks for approval or rejection..."
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={updating}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve PR</AlertDialogTitle>
                      <AlertDialogDescription>
                        Approve PR {pr.prNo}? This will allow PO creation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => updateStatus("APPROVED")}
                      >
                        Approve
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={updating}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject PR</AlertDialogTitle>
                      <AlertDialogDescription>
                        Reject PR {pr.prNo}? It can be revised and resubmitted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => updateStatus("REJECTED")}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {pr.status === "PENDING_APPROVAL" && !isApprover && (
              <p className="text-sm text-muted-foreground">
                Awaiting approval from Management/Admin.
              </p>
            )}

            {pr.status === "APPROVED" && (
              <Button
                onClick={() =>
                  router.push(`/purchase/orders/create?prId=${pr.id}`)
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Purchase Order
              </Button>
            )}

            {pr.status === "REJECTED" && (
              <Button
                variant="outline"
                disabled={updating}
                onClick={() => updateStatus("DRAFT")}
              >
                Revert to Draft
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
