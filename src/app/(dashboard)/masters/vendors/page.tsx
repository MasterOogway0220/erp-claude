"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Vendor {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  approvedStatus: boolean;
  productsSupplied: string | null;
  avgLeadTimeDays: number | null;
  performanceScore: number | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  gstNo: string | null;
  gstType: string | null;
  pan: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  bankBranchName: string | null;
  bankAccountType: string | null;
  tanNo: string | null;
  vendorRating: number | null;
  approvalDate: string | null;
  approvedById: string | null;
  approvalRemarks: string | null;
  approvedBy: { id: string; name: string } | null;
}

export default function VendorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalVendor, setApprovalVendor] = useState<Vendor | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const canApprove = user?.role === "MANAGEMENT" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => {
      const params = new URLSearchParams({ search, includeInactive: "true" });
      const res = await fetch(`/api/masters/vendors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/vendors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete vendor");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/masters/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(variables.isActive ? "Vendor activated" : "Vendor deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      remarks,
    }: {
      id: string;
      action: string;
      remarks: string;
    }) => {
      const res = await fetch(`/api/masters/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvalRemarks: remarks }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} vendor`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(
        variables.action === "approve" ? "Vendor approved" : "Vendor rejected"
      );
      setApprovalDialogOpen(false);
      setApprovalRemarks("");
      setApprovalVendor(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleApprovalDialog = (vendor: Vendor, action: "approve" | "reject") => {
    setApprovalVendor(vendor);
    setApprovalAction(action);
    setApprovalRemarks("");
    setApprovalDialogOpen(true);
  };

  const handleApprovalSubmit = () => {
    if (!approvalVendor) return;
    if (approvalAction === "reject" && !approvalRemarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }
    approvalMutation.mutate({
      id: approvalVendor.id,
      action: approvalAction,
      remarks: approvalRemarks,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Master"
        description="Manage approved vendors and suppliers"
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, GST, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => router.push("/masters/vendors/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>City</TableHead>
              <TableHead>GST No</TableHead>
              <TableHead>Products Supplied</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : data?.vendors?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              data?.vendors?.map((vendor: Vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contactPerson || "—"}</TableCell>
                  <TableCell>{vendor.city || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {vendor.gstNo || "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {vendor.productsSupplied || "—"}
                  </TableCell>
                  <TableCell>
                    {vendor.vendorRating ? (
                      <Badge variant="outline">{vendor.vendorRating}/5</Badge>
                    ) : vendor.performanceScore ? (
                      <Badge variant="outline">{vendor.performanceScore}/10</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        {vendor.approvedStatus ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : vendor.approvalRemarks && !vendor.approvedById ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={vendor.isActive}
                          onCheckedChange={(v) =>
                            toggleActiveMutation.mutate({ id: vendor.id, isActive: v })
                          }
                          aria-label={vendor.isActive ? "Deactivate vendor" : "Activate vendor"}
                        />
                        <span
                          className={
                            vendor.isActive ? "text-xs text-foreground" : "text-xs text-muted-foreground"
                          }
                        >
                          {vendor.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {vendor.approvedBy && vendor.approvedStatus && (
                        <span className="text-xs text-muted-foreground">
                          by {vendor.approvedBy.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canApprove && !vendor.approvedStatus && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Approve Vendor"
                          onClick={() => handleApprovalDialog(vendor, "approve")}
                        >
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {canApprove && vendor.approvedStatus && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reject Vendor"
                          onClick={() => handleApprovalDialog(vendor, "reject")}
                        >
                          <ThumbsDown className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/masters/vendors/${vendor.id}/edit`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{vendor.name}&quot;? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(vendor.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve" : "Reject"} Vendor
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? `Approve "${approvalVendor?.name}" as an authorized vendor.`
                : `Reject "${approvalVendor?.name}". Please provide a reason.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="approvalRemarks">
                Remarks {approvalAction === "reject" ? "*" : "(optional)"}
              </Label>
              <Textarea
                id="approvalRemarks"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder={
                  approvalAction === "approve"
                    ? "Optional remarks..."
                    : "Reason for rejection..."
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovalDialogOpen(false);
                  setApprovalRemarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprovalSubmit}
                disabled={
                  approvalMutation.isPending ||
                  (approvalAction === "reject" && !approvalRemarks.trim())
                }
                className={
                  approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""
                }
                variant={approvalAction === "reject" ? "destructive" : "default"}
              >
                {approvalAction === "approve" ? (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
