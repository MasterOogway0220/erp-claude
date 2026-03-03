"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Quality",
  "Testing",
  "Documentation",
  "Packaging",
  "Marking",
  "Inspection",
];

interface TechDetail {
  id: string;
  category: string;
  paramName: string;
  defaultValue: string | null;
  isMandatory: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface FormData {
  category: string;
  paramName: string;
  defaultValue: string;
  isMandatory: boolean;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm: FormData = {
  category: "",
  paramName: "",
  defaultValue: "",
  isMandatory: false,
  sortOrder: 0,
  isActive: true,
};

export default function TechnicalExchangePage() {
  const [details, setDetails] = useState<TechDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechDetail | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TechDetail | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/technical-exchange?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDetails(data.details || []);
    } catch {
      toast.error("Failed to load technical exchange details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDetails = activeTab === "ALL"
    ? details.sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder)
    : details
        .filter((d) => d.category === activeTab)
        .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleOpenCreate = () => {
    setEditingItem(null);
    const category = activeTab !== "ALL" ? activeTab : "";
    const catDetails = category ? details.filter((d) => d.category === category) : details;
    const maxSort = catDetails.length > 0
      ? Math.max(...catDetails.map((d) => d.sortOrder))
      : 0;
    setFormData({ ...emptyForm, category, sortOrder: maxSort + 1 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: TechDetail) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      paramName: item.paramName,
      defaultValue: item.defaultValue || "",
      isMandatory: item.isMandatory,
      sortOrder: item.sortOrder,
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
    if (!formData.paramName.trim()) {
      toast.error("Parameter name is required");
      return;
    }
    if (!formData.category) {
      toast.error("Category is required");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch("/api/masters/technical-exchange", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...formData }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Detail updated");
      } else {
        const res = await fetch("/api/masters/technical-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Detail created");
      }
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: TechDetail) => {
    try {
      const res = await fetch("/api/masters/technical-exchange", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Detail deleted");
      setDeletingItem(null);
      fetchData();
    } catch {
      toast.error("Failed to delete detail");
    }
  };

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = details.filter((d) => d.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technical / Quality Exchange Details"
        description="Manage technical and quality parameters exchanged with customers and vendors"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.length}</div>
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
              {details.filter((d) => d.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mandatory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {details.filter((d) => d.isMandatory).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(details.map((d) => d.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ALL">All ({details.length})</TabsTrigger>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat} ({categoryCounts[cat] || 0})
              </TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Detail
          </Button>
        </div>

        {loading ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground mt-4">
            Loading...
          </div>
        ) : (
          <>
            <TabsContent value="ALL">
              <DetailTable details={filteredDetails} onEdit={handleOpenEdit} onDelete={setDeletingItem} showCategory />
            </TabsContent>
            {CATEGORIES.map((cat) => (
              <TabsContent key={cat} value={cat}>
                <DetailTable details={filteredDetails} onEdit={handleOpenEdit} onDelete={setDeletingItem} />
              </TabsContent>
            ))}
          </>
        )}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit" : "Add"} Technical Exchange Detail
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Parameter Name *</Label>
                <Input
                  value={formData.paramName}
                  onChange={(e) => setFormData({ ...formData, paramName: e.target.value })}
                  placeholder="e.g., Third Party Inspection"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Default Value</Label>
                <Input
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="e.g., Required as per EN10204 3.1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-6">
                    <Label className="text-sm">Mandatory</Label>
                    <Switch
                      checked={formData.isMandatory}
                      onCheckedChange={(v) => setFormData({ ...formData, isMandatory: v })}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                    />
                    <span className="text-sm">Inactive</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technical Detail</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingItem?.paramName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingItem && handleDelete(deletingItem)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailTable({
  details,
  onEdit,
  onDelete,
  showCategory = false,
}: {
  details: TechDetail[];
  onEdit: (d: TechDetail) => void;
  onDelete: (d: TechDetail) => void;
  showCategory?: boolean;
}) {
  if (details.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No details found. Click &quot;Add Detail&quot; to create one.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium w-12">#</th>
            {showCategory && (
              <th className="text-left px-4 py-3 font-medium w-32">Category</th>
            )}
            <th className="text-left px-4 py-3 font-medium">Parameter Name</th>
            <th className="text-left px-4 py-3 font-medium">Default Value</th>
            <th className="text-left px-4 py-3 font-medium w-24">Mandatory</th>
            <th className="text-left px-4 py-3 font-medium w-20">Status</th>
            <th className="text-right px-4 py-3 font-medium w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {details.map((detail) => (
            <tr
              key={detail.id}
              className={`border-b last:border-0 hover:bg-muted/30 ${!detail.isActive ? "opacity-50" : ""}`}
            >
              <td className="px-4 py-3 text-muted-foreground">{detail.sortOrder}</td>
              {showCategory && (
                <td className="px-4 py-3">
                  <Badge variant="outline">{detail.category}</Badge>
                </td>
              )}
              <td className="px-4 py-3 font-medium">{detail.paramName}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                {detail.defaultValue || "--"}
              </td>
              <td className="px-4 py-3">
                {detail.isMandatory ? (
                  <Badge className="bg-orange-500">Required</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Optional</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant={detail.isActive ? "default" : "secondary"}>
                  {detail.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(detail)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(detail)} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
