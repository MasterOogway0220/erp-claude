"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
}

interface Buyer {
  id: string;
  customerId: string;
  buyerName: string;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  telephone: string | null;
  isActive: boolean;
  customer: {
    id: string;
    name: string;
  };
}

interface BuyerFormData {
  customerId: string;
  buyerName: string;
  designation: string;
  email: string;
  mobile: string;
  telephone: string;
  isActive: boolean;
}

const emptyForm: BuyerFormData = {
  customerId: "",
  buyerName: "",
  designation: "",
  email: "",
  mobile: "",
  telephone: "",
  isActive: true,
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [formData, setFormData] = useState<BuyerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBuyers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (customerFilter) params.set("customerId", customerFilter);
      const res = await fetch(`/api/masters/buyers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch buyers");
      const data = await res.json();
      setBuyers(data.buyers);
    } catch {
      toast.error("Failed to load buyers");
    } finally {
      setLoading(false);
    }
  }, [search, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/masters/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers);
    } catch {
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchBuyers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchBuyers]);

  const handleOpenDialog = (buyer?: Buyer) => {
    if (buyer) {
      setEditingBuyer(buyer);
      setFormData({
        customerId: buyer.customerId,
        buyerName: buyer.buyerName,
        designation: buyer.designation || "",
        email: buyer.email || "",
        mobile: buyer.mobile || "",
        telephone: buyer.telephone || "",
        isActive: buyer.isActive,
      });
    } else {
      setEditingBuyer(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBuyer(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!formData.buyerName.trim()) {
      toast.error("Buyer name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSaving(true);
    try {
      if (editingBuyer) {
        const res = await fetch(`/api/masters/buyers/${editingBuyer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to update buyer");
        toast.success("Buyer updated successfully");
      } else {
        const res = await fetch("/api/masters/buyers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create buyer");
        toast.success("Buyer created successfully");
      }
      handleCloseDialog();
      fetchBuyers();
    } catch {
      toast.error(
        editingBuyer ? "Failed to update buyer" : "Failed to create buyer"
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Buyer>[] = [
    {
      key: "buyerName",
      header: "Buyer Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.buyerName}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => row.customer?.name || "—",
    },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "—",
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: (row) => row.mobile || "—",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenDialog(row)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer Master"
        description="Manage buyer contacts for each customer"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Buyer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingBuyer ? "Edit" : "Add"} Buyer
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Customer Dropdown */}
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Buyer Name */}
                <div className="grid gap-2">
                  <Label htmlFor="buyerName">Buyer Name *</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerName: e.target.value })
                    }
                    placeholder="e.g., Rajesh Kumar"
                    required
                  />
                </div>

                {/* Designation */}
                <div className="grid gap-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    placeholder="e.g., Purchase Manager"
                  />
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g., buyer@company.com"
                    required
                  />
                </div>

                {/* Mobile & Telephone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                      placeholder="e.g., +91 98765 43210"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telephone">Telephone</Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) =>
                        setFormData({ ...formData, telephone: e.target.value })
                      }
                      placeholder="e.g., 022-12345678"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive === true}
                        onChange={() =>
                          setFormData({ ...formData, isActive: true })
                        }
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive === false}
                        onChange={() =>
                          setFormData({ ...formData, isActive: false })
                        }
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingBuyer
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-sm">
              <Label htmlFor="search" className="mb-2 block text-sm">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] max-w-sm">
              <Label htmlFor="customerFilter" className="mb-2 block text-sm">
                Customer
              </Label>
              <Select
                value={customerFilter}
                onValueChange={(value) =>
                  setCustomerFilter(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading buyers...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={buyers}
          searchKey="buyerName"
          searchPlaceholder="Search buyers..."
        />
      )}
    </div>
  );
}
