"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface MaterialCode {
  id: string;
  code: string;
  description: string | null;
  productType: string | null;
  materialGrade: string | null;
  size: string | null;
  schedule: string | null;
  timesQuoted: number;
  timesOrdered: number;
  createdAt: string;
  updatedAt: string;
}

interface MaterialCodeFormData {
  code: string;
  description: string;
  productType: string;
  materialGrade: string;
  size: string;
  schedule: string;
}

const emptyForm: MaterialCodeFormData = {
  code: "",
  description: "",
  productType: "",
  materialGrade: "",
  size: "",
  schedule: "",
};

export default function MaterialCodesPage() {
  const [materialCodes, setMaterialCodes] = useState<MaterialCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialCode | null>(null);
  const [formData, setFormData] = useState<MaterialCodeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMaterialCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/material-codes");
      if (!res.ok) throw new Error("Failed to fetch material codes");
      const data = await res.json();
      setMaterialCodes(data.materialCodes || []);
    } catch (error) {
      console.error("Failed to fetch material codes:", error);
      toast.error("Failed to fetch material codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterialCodes();
  }, [fetchMaterialCodes]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MaterialCode) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      description: item.description || "",
      productType: item.productType || "",
      materialGrade: item.materialGrade || "",
      size: item.size || "",
      schedule: item.schedule || "",
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

    if (!formData.code.trim()) {
      toast.error("Code is required");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/masters/material-codes/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update material code");
        }
        toast.success("Material code updated successfully");
      } else {
        const res = await fetch("/api/masters/material-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create material code");
        }
        toast.success("Material code created successfully");
      }
      handleCloseDialog();
      fetchMaterialCodes();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MaterialCode>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-sm font-medium">{row.code}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => row.description || "\u2014",
    },
    {
      key: "productType",
      header: "Product Type",
      sortable: true,
      cell: (row) => row.productType || "\u2014",
    },
    {
      key: "materialGrade",
      header: "Material Grade",
      sortable: true,
      cell: (row) => row.materialGrade || "\u2014",
    },
    {
      key: "size",
      header: "Size",
      cell: (row) => row.size || "\u2014",
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (row) => row.schedule || "\u2014",
    },
    {
      key: "timesQuoted",
      header: "Times Quoted",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground">{row.timesQuoted ?? 0}</span>
      ),
    },
    {
      key: "timesOrdered",
      header: "Times Ordered",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground">{row.timesOrdered ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenEdit(row)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Code Master"
        description="Manage material codes used across quotations, sales, and purchase orders"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Material Code
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Material Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              Loading material codes...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={materialCodes}
              searchKey="code"
              searchPlaceholder="Search by code..."
              pageSize={20}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit" : "Add"} Material Code
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g., MC-PIPE-CS-001"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Carbon Steel Seamless Pipe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="productType">Product Type</Label>
                  <Input
                    id="productType"
                    value={formData.productType}
                    onChange={(e) =>
                      setFormData({ ...formData, productType: e.target.value })
                    }
                    placeholder="e.g., Seamless Pipe"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="materialGrade">Material Grade</Label>
                  <Input
                    id="materialGrade"
                    value={formData.materialGrade}
                    onChange={(e) =>
                      setFormData({ ...formData, materialGrade: e.target.value })
                    }
                    placeholder="e.g., ASTM A106 Gr. B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    placeholder='e.g., 2" NB'
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Input
                    id="schedule"
                    value={formData.schedule}
                    onChange={(e) =>
                      setFormData({ ...formData, schedule: e.target.value })
                    }
                    placeholder="e.g., SCH 40"
                  />
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
