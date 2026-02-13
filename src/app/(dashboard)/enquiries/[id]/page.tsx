"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  OPEN: "default",
  QUOTATION_PREPARED: "secondary",
  WON: "default",
  LOST: "destructive",
  CANCELLED: "outline",
};

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const markAsLostMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const res = await fetch(`/api/enquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LOST", lostReason: reason }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Enquiry marked as LOST");
      queryClient.invalidateQueries({ queryKey: ["enquiry", params.id] });
      setIsLostDialogOpen(false);
      setLostReason("");
    },
    onError: () => toast.error("Failed to update enquiry status"),
  });

  // Fetch enquiry
  const { data, isLoading } = useQuery({
    queryKey: ["enquiry", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/enquiries/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch enquiry");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading enquiry...</div>
      </div>
    );
  }

  const enquiry = data?.enquiry;
  if (!enquiry) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Enquiry not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={enquiry.enquiryNo}
            description={`Enquiry from ${enquiry.customer.name}`}
          />
        </div>
        <Badge variant={statusColors[enquiry.status] as any}>
          {enquiry.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => router.push(`/quotations/create?enquiryId=${enquiry.id}`)}>
          <FileText className="h-4 w-4 mr-2" />
          Create Quotation
        </Button>
        {enquiry.status !== "LOST" && enquiry.status !== "WON" && (
          <Button
            variant="destructive"
            onClick={() => setIsLostDialogOpen(true)}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark as Lost
          </Button>
        )}
      </div>

      {/* Enquiry Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enquiry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Enquiry No.</div>
              <div className="font-medium">{enquiry.enquiryNo}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {format(new Date(enquiry.enquiryDate), "dd MMM yyyy")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Enquiry Mode</div>
              <div className="font-medium">{enquiry.enquiryMode}</div>
            </div>
            {enquiry.projectName && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Project</div>
                <div className="font-medium">{enquiry.projectName}</div>
              </div>
            )}
            {enquiry.clientInquiryNo && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Client Inquiry No.</div>
                <div className="font-medium">{enquiry.clientInquiryNo}</div>
              </div>
            )}
            {enquiry.priority && enquiry.priority !== "NORMAL" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Priority</div>
                <div>
                  <Badge variant={enquiry.priority === "CRITICAL" ? "destructive" : "secondary"}>
                    {enquiry.priority}
                  </Badge>
                </div>
              </div>
            )}
            {enquiry.priority === "NORMAL" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Priority</div>
                <div className="font-medium">Normal</div>
              </div>
            )}
            {enquiry.expectedClosureDate && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Expected Closure</div>
                <div className="font-medium">
                  {format(new Date(enquiry.expectedClosureDate), "dd MMM yyyy")}
                </div>
              </div>
            )}
            {enquiry.projectLocation && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Project Location</div>
                <div className="font-medium">{enquiry.projectLocation}</div>
              </div>
            )}
            {enquiry.endUser && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">End User</div>
                <div className="font-medium">{enquiry.endUser}</div>
              </div>
            )}
            {enquiry.remarks && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Remarks</div>
                <div className="font-medium">{enquiry.remarks}</div>
              </div>
            )}
            {enquiry.lostReason && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Lost Reason</div>
                <div className="font-medium text-destructive">{enquiry.lostReason}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer & Buyer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{enquiry.customer.name}</div>
            </div>
            {enquiry.buyerName && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Buyer Name</div>
                <div className="font-medium">{enquiry.buyerName}</div>
              </div>
            )}
            {enquiry.buyerDesignation && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Designation</div>
                <div className="font-medium">{enquiry.buyerDesignation}</div>
              </div>
            )}
            {enquiry.buyerEmail && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{enquiry.buyerEmail}</div>
              </div>
            )}
            {enquiry.buyerContact && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Contact</div>
                <div className="font-medium">{enquiry.buyerContact}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Enquiry Items ({enquiry.items.length})</CardTitle>
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
                  <TableHead>Additional Spec</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiry.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">{item.product || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.material || "—"}
                    </TableCell>
                    <TableCell>{item.size || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.additionalSpec || "—"}
                    </TableCell>
                    <TableCell>{item.ends || "—"}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity ? parseFloat(item.quantity).toFixed(3) : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Related Quotations */}
      {enquiry.quotations && enquiry.quotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Quotations ({enquiry.quotations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enquiry.quotations.map((quotation: any) => (
                <div
                  key={quotation.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => router.push(`/quotations/${quotation.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{quotation.quotationNo}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(quotation.quotationDate), "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusColors[quotation.status] as any}>
                    {quotation.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lost Reason Dialog */}
      <Dialog open={isLostDialogOpen} onOpenChange={setIsLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Enquiry as Lost</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Reason for Loss *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="e.g., Price too high, Competitor won, Customer cancelled requirement..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLostDialogOpen(false);
                setLostReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!lostReason.trim()) {
                  toast.error("Please provide a reason for marking as lost");
                  return;
                }
                markAsLostMutation.mutate({ reason: lostReason });
              }}
              disabled={markAsLostMutation.isPending}
            >
              {markAsLostMutation.isPending ? "Updating..." : "Confirm Lost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
