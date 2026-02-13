"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TaxRate {
  id: string;
  code: string | null;
  name: string;
  percentage: number | string;
  taxType: string | null;
  hsnCode: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaxFormData {
  code: string;
  name: string;
  percentage: string;
  taxType: string;
  hsnCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

const emptyForm: TaxFormData = {
  code: "",
  name: "",
  percentage: "",
  taxType: "",
  hsnCode: "",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: true,
};

const TAX_TYPES = ["CGST", "SGST", "IGST", "ZERO_RATED"];

export default function TaxMasterPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState<TaxFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/tax");
      if (!res.ok) throw new Error("Failed to fetch tax rates");
      const data = await res.json();
      setTaxRates(data.taxRates || []);
    } catch {
      toast.error("Failed to load tax rates");
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

  const handleOpenEdit = (item: TaxRate) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name,
      percentage: String(item.percentage),
      taxType: item.taxType || "",
      hsnCode: item.hsnCode || "",
      effectiveFrom: item.effectiveFrom
        ? format(new Date(item.effectiveFrom), "yyyy-MM-dd")
        : "",
      effectiveTo: item.effectiveTo
        ? format(new Date(item.effectiveTo), "yyyy-MM-dd")
        : "",
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

    if (!formData.name.trim() || !formData.percentage) {
      toast.error("Name and percentage are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/masters/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          percentage: parseFloat(formData.percentage),
          taxType: formData.taxType || null,
          effectiveFrom: formData.effectiveFrom || null,
          effectiveTo: formData.effectiveTo || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save tax rate");
      }
      toast.success(
        editingItem
          ? "Tax rate updated successfully"
          : "Tax rate created successfully"
      );
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save tax rate");
    } finally {
      setSaving(false);
    }
  };

  const getTaxTypeBadgeColor = (taxType: string | null) => {
    switch (taxType) {
      case "CGST":
        return "bg-blue-500";
      case "SGST":
        return "bg-indigo-500";
      case "IGST":
        return "bg-purple-500";
      case "ZERO_RATED":
        return "bg-gray-500";
      default:
        return "bg-slate-500";
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
      key: "percentage",
      header: "Rate (%)",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">{Number(row.percentage).toFixed(2)}%</span>
      ),
    },
    {
      key: "taxType",
      header: "Tax Type",
      sortable: true,
      cell: (row) =>
        row.taxType ? (
          <Badge className={getTaxTypeBadgeColor(row.taxType)}>
            {row.taxType}
          </Badge>
        ) : (
          "--"
        ),
    },
    {
      key: "hsnCode",
      header: "HSN Code",
      cell: (row) =>
        row.hsnCode ? (
          <span className="font-mono text-sm">{row.hsnCode}</span>
        ) : (
          "--"
        ),
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      cell: (row) =>
        row.effectiveFrom
          ? format(new Date(row.effectiveFrom), "dd/MM/yyyy")
          : "--",
    },
    {
      key: "effectiveTo",
      header: "Effective To",
      cell: (row) =>
        row.effectiveTo
          ? format(new Date(row.effectiveTo), "dd/MM/yyyy")
          : "--",
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
        title="Tax Master"
        description="Manage GST rates, tax types, and HSN codes"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tax Rate
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxRates.length}</div>
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
              {taxRates.filter((t) => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GST Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {taxRates.filter((t) => ["CGST", "SGST", "IGST"].includes(t.taxType || "")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zero Rated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {taxRates.filter((t) => t.taxType === "ZERO_RATED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading tax rates...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={taxRates}
          searchKey="name"
          searchPlaceholder="Search by name..."
          pageSize={15}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit" : "Add"} Tax Rate
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder='e.g., "GST18"'
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="percentage">Rate (%) *</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, percentage: e.target.value })
                    }
                    placeholder="e.g., 18"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., "GST 18%"'
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="taxType">Tax Type</Label>
                  <Select
                    value={formData.taxType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, taxType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hsnCode">HSN Code</Label>
                  <Input
                    id="hsnCode"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hsnCode: e.target.value })
                    }
                    placeholder='e.g., "73044900"'
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveFrom: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="effectiveTo">Effective To</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveTo: e.target.value })
                    }
                  />
                </div>
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
