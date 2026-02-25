"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

interface OfferTerm {
  id: string;
  termName: string;
  termDefaultValue: string | null;
  sortOrder: number;
  quotationType: string;
  isActive: boolean;
}

interface FormData {
  termName: string;
  termDefaultValue: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm: FormData = {
  termName: "",
  termDefaultValue: "",
  sortOrder: 0,
  isActive: true,
};

export default function OfferTermsPage() {
  const [terms, setTerms] = useState<OfferTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("DOMESTIC");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferTerm | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all terms (both types) without active filter
      const res = await fetch("/api/offer-term-templates?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTerms(data.templates || []);
    } catch {
      toast.error("Failed to load offer terms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTerms = terms
    .filter((t) => t.quotationType === activeTab)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleOpenCreate = () => {
    setEditingItem(null);
    const maxSort = filteredTerms.length > 0
      ? Math.max(...filteredTerms.map((t) => t.sortOrder))
      : 0;
    setFormData({ ...emptyForm, sortOrder: maxSort + 1 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: OfferTerm) => {
    setEditingItem(item);
    setFormData({
      termName: item.termName,
      termDefaultValue: item.termDefaultValue || "",
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
    if (!formData.termName.trim()) {
      toast.error("Term name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch("/api/offer-term-templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...formData }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Term updated");
      } else {
        const res = await fetch("/api/offer-term-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, quotationType: activeTab }),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Term created");
      }
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: OfferTerm) => {
    try {
      const res = await fetch("/api/offer-term-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(item.isActive ? "Term deactivated" : "Term activated");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const domesticCount = terms.filter((t) => t.quotationType === "DOMESTIC").length;
  const exportCount = terms.filter((t) => t.quotationType === "EXPORT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offer Terms Master"
        description="Manage default offer terms for Domestic and Export quotations"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Domestic Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domesticCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Export Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exportCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {terms.filter((t) => t.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="DOMESTIC">Domestic ({domesticCount})</TabsTrigger>
            <TabsTrigger value="EXPORT">Export ({exportCount})</TabsTrigger>
          </TabsList>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </div>

        {loading ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground mt-4">
            Loading offer terms...
          </div>
        ) : (
          <>
            <TabsContent value="DOMESTIC">
              <TermTable terms={filteredTerms} onEdit={handleOpenEdit} onToggle={handleToggleActive} />
            </TabsContent>
            <TabsContent value="EXPORT">
              <TermTable terms={filteredTerms} onEdit={handleOpenEdit} onToggle={handleToggleActive} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit" : "Add"} Offer Term ({activeTab})
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Term Name *</Label>
                <Input
                  value={formData.termName}
                  onChange={(e) => setFormData({ ...formData, termName: e.target.value })}
                  placeholder="e.g., Payment"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Default Value</Label>
                <Input
                  value={formData.termDefaultValue}
                  onChange={(e) => setFormData({ ...formData, termDefaultValue: e.target.value })}
                  placeholder="e.g., 100% within 30 days"
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
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-4 pt-2">
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
    </div>
  );
}

function TermTable({
  terms,
  onEdit,
  onToggle,
}: {
  terms: OfferTerm[];
  onEdit: (t: OfferTerm) => void;
  onToggle: (t: OfferTerm) => void;
}) {
  if (terms.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No terms found. Click "Add Term" to create one.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium w-16">#</th>
            <th className="text-left px-4 py-3 font-medium w-48">Term Name</th>
            <th className="text-left px-4 py-3 font-medium">Default Value</th>
            <th className="text-left px-4 py-3 font-medium w-24">Status</th>
            <th className="text-right px-4 py-3 font-medium w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((term) => (
            <tr
              key={term.id}
              className={`border-b last:border-0 hover:bg-muted/30 ${!term.isActive ? "opacity-50" : ""}`}
            >
              <td className="px-4 py-3 text-muted-foreground">{term.sortOrder}</td>
              <td className="px-4 py-3 font-medium">{term.termName}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                {term.termDefaultValue || "--"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={term.isActive ? "default" : "secondary"}>
                  {term.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(term)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggle(term)}
                    title={term.isActive ? "Deactivate" : "Activate"}
                  >
                    {term.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
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
