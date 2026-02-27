"use client";

import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ThumbsUp, ThumbsDown, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

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
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  vendorRating: number | null;
  approvalDate: string | null;
  approvedById: string | null;
  approvalRemarks: string | null;
  approvedBy: { id: string; name: string } | null;
}

interface VendorFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNo: string;
  gstType: string;
  panNo: string;
  productsSupplied: string;
  avgLeadTimeDays: string;
  performanceScore: string;
  vendorRating: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankName: string;
}

const emptyForm: VendorFormData = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  gstNo: "",
  gstType: "",
  panNo: "",
  productsSupplied: "",
  avgLeadTimeDays: "",
  performanceScore: "",
  vendorRating: "",
  bankAccountNo: "",
  bankIfsc: "",
  bankName: "",
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(emptyForm);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalVendor, setApprovalVendor] = useState<Vendor | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const canApprove = user?.role === "MANAGEMENT" || user?.role === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/masters/vendors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      const res = await fetch("/api/masters/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
      handleCloseSheet();
    },
    onError: () => {
      toast.error("Failed to create vendor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorFormData }) => {
      const res = await fetch(`/api/masters/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully");
      handleCloseSheet();
    },
    onError: () => {
      toast.error("Failed to update vendor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/vendors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete vendor");
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, action, remarks }: { id: string; action: string; remarks: string }) => {
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
      toast.success(variables.action === "approve" ? "Vendor approved" : "Vendor rejected");
      setApprovalDialogOpen(false);
      setApprovalRemarks("");
      setApprovalVendor(null);
    },
    onError: (error: any) => {
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

  const handleOpenSheet = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        addressLine1: vendor.addressLine1 || "",
        addressLine2: vendor.addressLine2 || "",
        city: vendor.city || "",
        state: vendor.state || "",
        country: vendor.country,
        pincode: vendor.pincode || "",
        gstNo: vendor.gstNo || "",
        gstType: vendor.gstType || "",
        panNo: (vendor as any).panNo || "",
        productsSupplied: vendor.productsSupplied || "",
        avgLeadTimeDays: vendor.avgLeadTimeDays?.toString() || "",
        performanceScore: vendor.performanceScore?.toString() || "",
        vendorRating: vendor.vendorRating?.toString() || "",
        bankAccountNo: vendor.bankAccountNo || "",
        bankIfsc: vendor.bankIfsc || "",
        bankName: vendor.bankName || "",
      });
    } else {
      setEditingVendor(null);
      setFormData(emptyForm);
    }
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingVendor(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
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
        <Button onClick={() => handleOpenSheet()}>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : data?.vendors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              data?.vendors?.map((vendor: Vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contactPerson || "—"}</TableCell>
                  <TableCell>{vendor.city || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{vendor.gstNo || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {vendor.productsSupplied || "—"}
                  </TableCell>
                  <TableCell>
                    {vendor.vendorRating ? (
                      <Badge variant="outline">{vendor.vendorRating}/10</Badge>
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
                        {!vendor.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
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
                        onClick={() => handleOpenSheet(vendor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
                placeholder={approvalAction === "approve" ? "Optional remarks..." : "Reason for rejection..."}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setApprovalDialogOpen(false); setApprovalRemarks(""); }}>
                Cancel
              </Button>
              <Button
                onClick={handleApprovalSubmit}
                disabled={approvalMutation.isPending || (approvalAction === "reject" && !approvalRemarks.trim())}
                className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={approvalAction === "reject" ? "destructive" : "default"}
              >
                {approvalAction === "approve" ? (
                  <><ThumbsUp className="h-4 w-4 mr-2" />Approve</>
                ) : (
                  <><ThumbsDown className="h-4 w-4 mr-2" />Reject</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet-based Form (matching Customer Master design) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="!max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingVendor ? "Edit" : "Add"} Vendor
            </SheetTitle>
            <SheetDescription>
              {editingVendor ? "Update" : "Create"} vendor / supplier information
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Vendor Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ISMT Limited"
                required
              />
            </div>

            {/* Contact Person Details */}
            <div>
              <div className="bg-muted px-3 py-2 rounded-md mb-3">
                <h4 className="text-sm font-medium">Contact Person Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Address & GST Details */}
            <div>
              <div className="bg-muted px-3 py-2 rounded-md mb-3">
                <h4 className="text-sm font-medium">Address & GST Details</h4>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => setFormData({ ...formData, state: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gstNo">GST Number</Label>
                    <Input
                      id="gstNo"
                      value={formData.gstNo}
                      onChange={(e) => setFormData({ ...formData, gstNo: e.target.value.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gstType">GST Type</Label>
                    <Select
                      value={formData.gstType}
                      onValueChange={(v) => setFormData({ ...formData, gstType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select GST type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGISTERED">Registered</SelectItem>
                        <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                        <SelectItem value="COMPOSITION">Composition</SelectItem>
                        <SelectItem value="SEZ">SEZ</SelectItem>
                        <SelectItem value="DEEMED_EXPORT">Deemed Export</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="panNo">PAN Number</Label>
                  <Input
                    id="panNo"
                    value={formData.panNo}
                    onChange={(e) => setFormData({ ...formData, panNo: e.target.value.toUpperCase() })}
                    placeholder="AAAAA0000A"
                    maxLength={10}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Vendor Details */}
            <div>
              <div className="bg-muted px-3 py-2 rounded-md mb-3">
                <h4 className="text-sm font-medium">Vendor Details</h4>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="productsSupplied">Products Supplied</Label>
                  <Textarea
                    id="productsSupplied"
                    value={formData.productsSupplied}
                    onChange={(e) => setFormData({ ...formData, productsSupplied: e.target.value })}
                    placeholder="e.g., CS Seamless Pipes, SS ERW Pipes, Alloy Steel Tubes"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="avgLeadTimeDays">Avg Lead Time (Days)</Label>
                    <Input
                      id="avgLeadTimeDays"
                      type="number"
                      value={formData.avgLeadTimeDays}
                      onChange={(e) => setFormData({ ...formData, avgLeadTimeDays: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendorRating">Vendor Rating (0-10)</Label>
                    <Input
                      id="vendorRating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.vendorRating}
                      onChange={(e) => setFormData({ ...formData, vendorRating: e.target.value })}
                      placeholder="8.5"
                    />
                  </div>
                </div>

                {editingVendor && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground text-xs">Approval Status</Label>
                      <div className="mt-1">
                        {editingVendor.approvedStatus ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : editingVendor.approvalRemarks && !editingVendor.approvedById ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : (
                          <Badge variant="secondary">Pending Approval</Badge>
                        )}
                      </div>
                    </div>
                    {editingVendor.approvedBy && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Approved By</Label>
                        <div className="text-sm mt-1">{editingVendor.approvedBy.name}</div>
                        {editingVendor.approvalDate && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(editingVendor.approvalDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                    {editingVendor.approvalRemarks && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Remarks</Label>
                        <div className="text-sm mt-1">{editingVendor.approvalRemarks}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Bank Details */}
            <div>
              <div className="bg-muted px-3 py-2 rounded-md mb-3">
                <h4 className="text-sm font-medium">Bank Details</h4>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g., State Bank of India"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bankAccountNo">Account Number</Label>
                    <Input
                      id="bankAccountNo"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bankIfsc">IFSC Code</Label>
                    <Input
                      id="bankIfsc"
                      value={formData.bankIfsc}
                      onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                      placeholder="SBIN0001234"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseSheet}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingVendor
                  ? "Update Vendor"
                  : "Create Vendor"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
