"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const VENDOR_PRESETS = [
  "Manufacturer", "Trader", "Stockist", "Laboratory", "TPI",
  "Packing", "Transporter", "Freight Forwarder", "Service Provider",
];

export default function IndustrySegmentPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("CUSTOMER");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "CUSTOMER" });

  const { data, isLoading } = useQuery({
    queryKey: ["industry-segments"],
    queryFn: async () => {
      const res = await fetch("/api/masters/industry-segments");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const segments = (data?.segments || []).filter((s: any) => s.category === tab);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const url = editingId ? `/api/masters/industry-segments/${editingId}` : "/api/masters/industry-segments";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-segments"] });
      toast.success(editingId ? "Updated" : "Segment added");
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/industry-segments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-segments"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", category: tab });
    setDialogOpen(true);
  };

  const seedVendorPresets = async () => {
    if (!confirm("Add standard vendor type presets?")) return;
    for (const name of VENDOR_PRESETS) {
      try {
        await fetch("/api/masters/industry-segments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, category: "VENDOR" }),
        });
      } catch { /* skip duplicates */ }
    }
    queryClient.invalidateQueries({ queryKey: ["industry-segments"] });
    toast.success("Vendor presets added");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Industry Segment Master" description="Customer industry segments and vendor types">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Segment
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="CUSTOMER">Customer Segments</TabsTrigger>
            <TabsTrigger value="VENDOR">Vendor Types</TabsTrigger>
          </TabsList>
          {tab === "VENDOR" && segments.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedVendorPresets}>
              Seed Vendor Presets
            </Button>
          )}
        </div>

        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>{tab === "CUSTOMER" ? "Industry Segment" : "Vendor Type"}</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : segments.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">No segments found</TableCell></TableRow>
                ) : (
                  segments.map((s: any, i: number) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingId(s.id);
                            setForm({ name: s.name, category: s.category });
                            setDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id);
                          }}>
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
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Segment" : "Add Segment"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="VENDOR">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{form.category === "CUSTOMER" ? "Industry Segment" : "Vendor Type"} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.category === "CUSTOMER" ? "e.g., Oil & Gas, Power, Pharma" : "e.g., Manufacturer, Trader"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
