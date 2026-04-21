"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package, Copy } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaterialCode {
  id: string;
  code: string;
  clientItemCode: string | null;
  description: string | null;
  productType: string | null;
  materialGrade: string | null;
  size: string | null;
  odSize: string | null;
  nbSize: string | null;
  thickness: string | null;
  schedule: string | null;
  standard: string | null;
  unit: string | null;
  rate: string | null;
  lastQuotedPrice: string | null;
  timesQuoted: number;
  timesOrdered: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  code: string;
  clientItemCode: string;
  description: string;
  productType: string;
  materialGrade: string;
  size: string;
  odSize: string;
  nbSize: string;
  thickness: string;
  schedule: string;
  standard: string;
  unit: string;
  rate: string;
}

const emptyForm: FormData = {
  code: "",
  clientItemCode: "",
  description: "",
  productType: "",
  materialGrade: "",
  size: "",
  odSize: "",
  nbSize: "",
  thickness: "",
  schedule: "",
  standard: "",
  unit: "",
  rate: "",
};

const UNITS = ["MTR", "NOS", "KG", "SET", "LOT", "PCS", "TON", "LTR", "SQM", "RFT"];

const STANDARDS = [
  "ASTM", "ASME", "API", "IS", "EN", "DIN", "JIS", "BS", "ANSI",
  "ASTM A106", "ASTM A312", "ASTM A234", "ASTM A403", "ASTM A105",
  "ASTM A182", "ASTM A53", "ASTM A333", "ASTM A335",
  "ASME B16.9", "ASME B16.11", "ASME B16.5", "ASME B16.47",
  "API 5L", "API 5CT",
];

const SCHEDULES = [
  "SCH 5", "SCH 10", "SCH 20", "SCH 30", "SCH 40", "SCH 60",
  "SCH 80", "SCH 100", "SCH 120", "SCH 140", "SCH 160",
  "SCH STD", "SCH XS", "SCH XXS",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaterialCodesPage() {
  const router = useRouter();
  const [materialCodes, setMaterialCodes] = useState<MaterialCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MaterialCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMaterialCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/material-codes");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMaterialCodes(data.materialCodes || []);
    } catch {
      toast.error("Failed to fetch item codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterialCodes();
  }, [fetchMaterialCodes]);

  // Auto-compose size label from OD/NB/Thickness
  const composeSizeLabel = (od: string, nb: string, thick: string): string => {
    const parts: string[] = [];
    if (nb) parts.push(`${nb} NB`);
    if (od) parts.push(`OD ${od}`);
    if (thick) parts.push(`WT ${thick}`);
    return parts.join(" x ");
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-compose size when OD/NB/Thickness change
      if (field === "odSize" || field === "nbSize" || field === "thickness") {
        const od = field === "odSize" ? value : prev.odSize;
        const nb = field === "nbSize" ? value : prev.nbSize;
        const thick = field === "thickness" ? value : prev.thickness;
        next.size = composeSizeLabel(od, nb, thick);
      }
      return next;
    });
  };

  const handleOpenCreate = () => router.push("/masters/material-codes/create");

  const handleDuplicate = (item: MaterialCode) => {
    setEditingItem(null);
    setFormData({
      code: "",
      clientItemCode: item.clientItemCode || "",
      description: item.description || "",
      productType: item.productType || "",
      materialGrade: item.materialGrade || "",
      size: item.size || "",
      odSize: item.odSize || "",
      nbSize: item.nbSize || "",
      thickness: item.thickness || "",
      schedule: item.schedule || "",
      standard: item.standard || "",
      unit: item.unit || "",
      rate: item.rate || "",
    });
    setIsDialogOpen(true);
    toast.info("Duplicated — enter a new Item Code");
  };

  const handleOpenEdit = (item: MaterialCode) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      clientItemCode: item.clientItemCode || "",
      description: item.description || "",
      productType: item.productType || "",
      materialGrade: item.materialGrade || "",
      size: item.size || "",
      odSize: item.odSize || "",
      nbSize: item.nbSize || "",
      thickness: item.thickness || "",
      schedule: item.schedule || "",
      standard: item.standard || "",
      unit: item.unit || "",
      rate: item.rate || "",
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
      toast.error("Item Code is required");
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
          throw new Error(err.error || "Failed to update");
        }
        toast.success("Item code updated successfully");
      } else {
        const res = await fetch("/api/masters/material-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create");
        }
        toast.success("Item code created successfully");
      }
      handleCloseDialog();
      fetchMaterialCodes();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/masters/material-codes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Item code deleted");
      setDeleteTarget(null);
      fetchMaterialCodes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Compute amount for display
  const formatRate = (rate: string | null) => {
    if (!rate) return "—";
    return `₹ ${parseFloat(rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const columns: Column<MaterialCode>[] = [
    {
      key: "code",
      header: "Item Code",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col justify-center gap-0.5">
          <span className="font-mono text-sm font-semibold text-primary leading-tight">{row.code}</span>
          {row.clientItemCode && (
            <span className="text-xs text-muted-foreground leading-tight">
              Client: {row.clientItemCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "Product Description",
      cell: (row) => (
        <span className="text-sm max-w-[250px] truncate block">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "materialGrade",
      header: "Grade",
      sortable: true,
      cell: (row) =>
        row.materialGrade ? (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.materialGrade}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "size",
      header: "Size",
      cell: (row) => row.size || "—",
    },
    {
      key: "schedule",
      header: "Schedule",
      sortable: true,
      cell: (row) => row.schedule || "—",
    },
    {
      key: "standard",
      header: "Standard",
      sortable: true,
      cell: (row) => row.standard || "—",
    },
    {
      key: "unit",
      header: "Unit",
      cell: (row) =>
        row.unit ? (
          <Badge variant="outline" className="text-xs">
            {row.unit}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "rate",
      header: "Rate",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-sm">{formatRate(row.rate)}</span>
      ),
    },
    {
      key: "timesOrdered",
      header: "Usage",
      sortable: true,
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          <div>Q: {row.timesQuoted ?? 0}</div>
          <div>O: {row.timesOrdered ?? 0}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(row)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(row)} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(row)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item / Material Code Master"
        description="Manage material codes and item entries as per Client P.O. specifications"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item Code
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{materialCodes.length}</div>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">
              {materialCodes.filter((m) => m.rate).length}
            </div>
            <p className="text-xs text-muted-foreground">With Rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">
              {new Set(materialCodes.map((m) => m.materialGrade).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique Grades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">
              {new Set(materialCodes.map((m) => m.standard).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Standards</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Item / Material Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              Loading items...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={materialCodes}
              searchKey="code"
              searchPlaceholder="Search by item code, description, grade..."
              pageSize={25}
            />
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingItem ? "Edit" : "New"} Item / Material Code
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Section 1: Identification */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">
                      Item Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                      placeholder="e.g., MC-PIPE-CS-001"
                      className="font-mono"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Internal material code</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientItemCode">Client Item Code</Label>
                    <Input
                      id="clientItemCode"
                      value={formData.clientItemCode}
                      onChange={(e) => updateField("clientItemCode", e.target.value)}
                      placeholder="Client's own code (if different)"
                    />
                    <p className="text-xs text-muted-foreground">As per Client P.O.</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Product Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Product Details
                </h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description">Product Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Full product description as mentioned in Client PO"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="productType">Product Type</Label>
                      <Input
                        id="productType"
                        value={formData.productType}
                        onChange={(e) => updateField("productType", e.target.value)}
                        placeholder="e.g., Seamless Pipe, ERW Pipe, Elbow"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="materialGrade">Material Grade</Label>
                      <Input
                        id="materialGrade"
                        value={formData.materialGrade}
                        onChange={(e) => updateField("materialGrade", e.target.value)}
                        placeholder="e.g., SS316L, ASTM A106 GR B"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Size & Specification */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Size & Specification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nbSize">NB (Nominal Bore)</Label>
                    <Input
                      id="nbSize"
                      value={formData.nbSize}
                      onChange={(e) => updateField("nbSize", e.target.value)}
                      placeholder='e.g., 2", 4", 6"'
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="odSize">OD (Outer Diameter)</Label>
                    <Input
                      id="odSize"
                      value={formData.odSize}
                      onChange={(e) => updateField("odSize", e.target.value)}
                      placeholder="e.g., 60.3mm, 114.3mm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="thickness">Thickness (WT)</Label>
                    <Input
                      id="thickness"
                      value={formData.thickness}
                      onChange={(e) => updateField("thickness", e.target.value)}
                      placeholder="e.g., 3.91mm, 5.54mm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="size">Size Label</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => updateField("size", e.target.value)}
                      placeholder="Auto-composed or custom"
                      className="bg-muted/30"
                    />
                    <p className="text-xs text-muted-foreground">Auto-composed from NB/OD/WT above</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schedule">Schedule</Label>
                    <Select
                      value={formData.schedule}
                      onValueChange={(v) => updateField("schedule", v)}
                    >
                      <SelectTrigger id="schedule">
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="standard">Standard</Label>
                    <Select
                      value={formData.standard}
                      onValueChange={(v) => updateField("standard", v)}
                    >
                      <SelectTrigger id="standard">
                        <SelectValue placeholder="Select standard" />
                      </SelectTrigger>
                      <SelectContent>
                        {STANDARDS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 4: Pricing & Unit */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pricing & Unit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit of Measurement</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(v) => updateField("unit", v)}
                    >
                      <SelectTrigger id="unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Rate (₹)</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.rate}
                      onChange={(e) => updateField("rate", e.target.value)}
                      placeholder="Default / last known rate"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.code}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
