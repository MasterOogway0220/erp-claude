"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { Plus, Pencil, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FinancialYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FinancialYearFormData {
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm: FinancialYearFormData = {
  label: "",
  startDate: "",
  endDate: "",
  isActive: false,
};

export default function FinancialYearsPage() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFY, setEditingFY] = useState<FinancialYear | null>(null);
  const [formData, setFormData] = useState<FinancialYearFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchFinancialYears = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/financial-years");
      if (!res.ok) throw new Error("Failed to fetch financial years");
      const data = await res.json();
      setFinancialYears(data.financialYears || []);
    } catch {
      toast.error("Failed to fetch financial years");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialYears();
  }, [fetchFinancialYears]);

  const handleOpenDialog = (fy?: FinancialYear) => {
    if (fy) {
      setEditingFY(fy);
      setFormData({
        label: fy.label,
        startDate: fy.startDate ? fy.startDate.substring(0, 10) : "",
        endDate: fy.endDate ? fy.endDate.substring(0, 10) : "",
        isActive: fy.isActive,
      });
    } else {
      setEditingFY(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFY(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingFY) {
        const res = await fetch(`/api/masters/financial-years/${editingFY.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update financial year");
        }
        toast.success("Financial year updated successfully");
      } else {
        const res = await fetch("/api/masters/financial-years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create financial year");
        }
        toast.success("Financial year created successfully");
      }
      handleCloseDialog();
      fetchFinancialYears();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch(`/api/masters/financial-years/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to set active financial year");
      }
      toast.success("Financial year set as active");
      fetchFinancialYears();
    } catch (error: any) {
      toast.error(error.message || "Failed to set active financial year");
    }
  };

  const columns: Column<FinancialYear>[] = [
    {
      key: "label",
      header: "Label",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      cell: (row) =>
        row.startDate
          ? format(new Date(row.startDate), "dd MMM yyyy")
          : "--",
    },
    {
      key: "endDate",
      header: "End Date",
      sortable: true,
      cell: (row) =>
        row.endDate
          ? format(new Date(row.endDate), "dd MMM yyyy")
          : "--",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!row.isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSetActive(row.id)}
              title="Set as Active"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Years"
        description="Manage financial year periods for document numbering and reporting"
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Financial Year
        </Button>
      </PageHeader>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Financial Years
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialYears.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Financial Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialYears.find((fy) => fy.isActive)?.label || "None"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {(() => {
                const active = financialYears.find((fy) => fy.isActive);
                if (!active) return "No active FY";
                return `${format(new Date(active.startDate), "dd MMM yyyy")} - ${format(new Date(active.endDate), "dd MMM yyyy")}`;
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading financial years...
        </div>
      ) : (
        <DataTable<FinancialYear>
          columns={columns}
          data={financialYears}
          searchKey="label"
          searchPlaceholder="Search by label..."
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingFY ? "Edit" : "Add"} Financial Year
              </DialogTitle>
              <DialogDescription>
                {editingFY ? "Update" : "Create a new"} financial year period
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="e.g., 2025-26"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Set as Active Financial Year
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingFY
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
