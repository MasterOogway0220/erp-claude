"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentTerm {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  days: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaymentTermFormData {
  code: string;
  name: string;
  description: string;
  days: number;
  isActive: boolean;
}

const emptyForm: PaymentTermFormData = {
  code: "",
  name: "",
  description: "",
  days: 30,
  isActive: true,
};

export default function PaymentTermsPage() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentTerm | null>(null);
  const [formData, setFormData] = useState<PaymentTermFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/payment-terms");
      if (!res.ok) throw new Error("Failed to fetch payment terms");
      const data = await res.json();
      setPaymentTerms(data.paymentTerms || []);
    } catch {
      toast.error("Failed to load payment terms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: PaymentTerm) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name,
      description: item.description || "",
      days: item.days,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/masters/payment-terms/${editingItem.id}`
        : "/api/masters/payment-terms";
      const res = await fetch(url, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save payment term");
      }
      toast.success(
        editingItem
          ? "Payment term updated successfully"
          : "Payment term created successfully"
      );
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save payment term");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PaymentTerm) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const res = await fetch(`/api/masters/payment-terms/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete payment term");
      }
      toast.success("Payment term deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment term");
    }
  };

  const columns: Column<any>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-medium">{row.code || "--"}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => row.description || "--",
    },
    {
      key: "days",
      header: "Credit Days",
      sortable: true,
      cell: (row) => (
        <Badge variant="outline">{row.days} days</Badge>
      ),
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Terms Master"
        description="Manage payment terms for customers and vendors"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Term
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentTerms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paymentTerms.filter((t) => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {paymentTerms.filter((t) => !t.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading payment terms...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={paymentTerms}
          searchKey="name"
          searchPlaceholder="Search by name..."
          pageSize={15}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit" : "Add"} Payment Term
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder='e.g., "NET30", "COD"'
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., "Net 30 Days"'
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Payment term description..."
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="days">Credit Days *</Label>
                <Input
                  id="days"
                  type="number"
                  min={0}
                  value={formData.days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      days: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

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
                    <span className="text-sm">Active</span>
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
                    <span className="text-sm">Inactive</span>
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
                  : editingItem
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
