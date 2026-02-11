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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string;
  approvedStatus: boolean;
  productsSupplied: string | null;
  avgLeadTimeDays: number | null;
  performanceScore: number | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface VendorFormData {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  approvedStatus: boolean;
  productsSupplied: string;
  avgLeadTimeDays: string;
  performanceScore: string;
  contactPerson: string;
  email: string;
  phone: string;
}

const emptyForm: VendorFormData = {
  name: "",
  addressLine1: "",
  city: "",
  state: "",
  country: "India",
  approvedStatus: true,
  productsSupplied: "",
  avgLeadTimeDays: "",
  performanceScore: "",
  contactPerson: "",
  email: "",
  phone: "",
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(emptyForm);

  // Fetch vendors
  const { data, isLoading } = useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/masters/vendors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  // Create mutation
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
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create vendor");
    },
  });

  // Update mutation
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
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update vendor");
    },
  });

  // Delete mutation
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

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        addressLine1: vendor.addressLine1 || "",
        city: vendor.city || "",
        state: vendor.state || "",
        country: vendor.country,
        approvedStatus: vendor.approvedStatus,
        productsSupplied: vendor.productsSupplied || "",
        avgLeadTimeDays: vendor.avgLeadTimeDays?.toString() || "",
        performanceScore: vendor.performanceScore?.toString() || "",
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
      });
    } else {
      setEditingVendor(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
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
        description="Manage approved vendors and suppliers (6 vendors seeded: ISMT, MSL, JSL, etc.)"
      />

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Products Supplied</TableHead>
              <TableHead>Lead Time (Days)</TableHead>
              <TableHead>Performance Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : data?.vendors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              data?.vendors?.map((vendor: Vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contactPerson || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {vendor.productsSupplied || "—"}
                  </TableCell>
                  <TableCell>{vendor.avgLeadTimeDays || "—"}</TableCell>
                  <TableCell>
                    {vendor.performanceScore ? (
                      <Badge variant="outline">{vendor.performanceScore}/10</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={vendor.approvedStatus ? "default" : "secondary"}>
                        {vendor.approvedStatus ? "Approved" : "Pending"}
                      </Badge>
                      {vendor.isActive && (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(vendor)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? "Edit" : "Add"} Vendor
              </DialogTitle>
              <DialogDescription>
                {editingVendor ? "Update" : "Create"} vendor information
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., ISMT, MSL, JSL"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="addressLine1">Address</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="avgLeadTimeDays">Avg Lead Time (Days)</Label>
                  <Input
                    id="avgLeadTimeDays"
                    type="number"
                    value={formData.avgLeadTimeDays}
                    onChange={(e) =>
                      setFormData({ ...formData, avgLeadTimeDays: e.target.value })
                    }
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="productsSupplied">Products Supplied</Label>
                <Textarea
                  id="productsSupplied"
                  value={formData.productsSupplied}
                  onChange={(e) =>
                    setFormData({ ...formData, productsSupplied: e.target.value })
                  }
                  placeholder="e.g., CS Seamless Pipes, SS ERW Pipes, Alloy Steel"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="performanceScore">Performance Score (0-10)</Label>
                  <Input
                    id="performanceScore"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.performanceScore}
                    onChange={(e) =>
                      setFormData({ ...formData, performanceScore: e.target.value })
                    }
                    placeholder="8.5"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="approvedStatus">Approval Status</Label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.approvedStatus === true}
                        onChange={() =>
                          setFormData({ ...formData, approvedStatus: true })
                        }
                      />
                      <span>Approved</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.approvedStatus === false}
                        onChange={() =>
                          setFormData({ ...formData, approvedStatus: false })
                        }
                      />
                      <span>Pending</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingVendor
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
