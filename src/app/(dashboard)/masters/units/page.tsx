"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
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
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Unit {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UnitFormData {
  code: string;
  name: string;
  isActive: boolean;
}

const emptyForm: UnitFormData = {
  code: "",
  name: "",
  isActive: true,
};

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      const data = await res.json();
      setUnits(data.units || []);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
      isActive: unit.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Code and Name are required");
      return;
    }

    setSaving(true);
    try {
      if (editingUnit) {
        const res = await fetch(`/api/masters/units/${editingUnit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update unit");
        }
        toast.success("Unit updated successfully");
      } else {
        const res = await fetch("/api/masters/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create unit");
        }
        toast.success("Unit created successfully");
      }
      handleCloseDialog();
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Unit>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row: Unit) => (
        <span className="font-medium">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: Unit) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Unit) => (
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
        title="Unit Master (UOM)"
        description="Manage units of measurement for products and materials"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </PageHeader>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
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
              {units.filter((u) => u.isActive).length}
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
              {units.filter((u) => !u.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading units...
        </div>
      ) : (
        <DataTable<Unit>
          columns={columns}
          data={units}
          searchKey="code"
          searchPlaceholder="Search by code..."
          pageSize={15}
        />
      )}

      {/* Pre-seeded reference */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">Pre-seeded Units</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The following standard units are pre-loaded in the system:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "Kg", name: "Kilogram" },
            { code: "Pcs", name: "Pieces" },
            { code: "Nos", name: "Numbers" },
            { code: "Mtr", name: "Meter" },
            { code: "Ft", name: "Feet" },
            { code: "MM", name: "Millimeter" },
            { code: "In", name: "Inch" },
            { code: "MT", name: "Metric Ton" },
            { code: "Set", name: "Set" },
            { code: "Lot", name: "Lot" },
            { code: "Bundle", name: "Bundle" },
          ].map((u) => (
            <Badge key={u.code} variant="outline">
              {u.code} - {u.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "Edit" : "Add"} Unit
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
                  placeholder='e.g., "Kg", "Pcs"'
                  required
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
                  placeholder='e.g., "Kilogram", "Pieces"'
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
                  : editingUnit
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
