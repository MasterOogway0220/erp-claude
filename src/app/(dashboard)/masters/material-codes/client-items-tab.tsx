"use client";

import { useState } from "react";
import { useReferenceQuery, useInvalidate } from "@/hooks/use-api-query";
import { useCustomers } from "@/hooks/use-masters";
import { useUnits } from "@/hooks/use-units";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Hash } from "lucide-react";
import { toast } from "sonner";

// Customer Item IDs — the customer's own line identifiers used on non-standard
// quotations. Rows appear here automatically whenever a non-standard quotation
// is saved (src/lib/quotations/client-items.ts); this tab is for curating
// them (a proper description, the unit) and adding IDs ahead of a quotation.

interface ClientItem {
  id: string;
  customerId: string;
  itemNo: string;
  description: string | null;
  unit: string | null;
  updatedAt: string;
  customer: { name: string };
  // DataTable's search reads one flat key; the customer name lives on a
  // relation, so it is copied up in `rows`.
  customerName?: string;
}

const empty = { customerId: "", itemNo: "", description: "", unit: "" };

export function ClientItemsTab() {
  const invalidate = useInvalidate();
  const customers = useCustomers();
  const units = useUnits();
  const { data, isLoading } = useReferenceQuery<{ clientItems: ClientItem[] }>(["client-items"], "/api/masters/client-items");
  const rows = (data?.clientItems ?? []).map((r) => ({ ...r, customerName: r.customer?.name ?? "" }));

  const [editing, setEditing] = useState<ClientItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row: ClientItem) => {
    setEditing(row);
    setForm({ customerId: row.customerId, itemNo: row.itemNo, description: row.description ?? "", unit: row.unit ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.customerId || !form.itemNo.trim()) { toast.error("Customer and Item ID are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/masters/client-items/${editing.id}` : "/api/masters/client-items", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      toast.success(editing ? "Item ID updated" : "Item ID added");
      invalidate(["client-items"]);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/masters/client-items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
      toast.success("Item ID deleted");
      invalidate(["client-items"]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: Column<ClientItem>[] = [
    { key: "customerName", header: "Customer", sortable: true },
    { key: "itemNo", header: "Item ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-semibold text-primary">{r.itemNo}</span> },
    { key: "description", header: "Description", cell: (r) => <span className="text-xs whitespace-pre-line line-clamp-3">{r.description || "—"}</span> },
    { key: "unit", header: "Unit", cell: (r) => r.unit || "—" },
    {
      key: "actions", header: "",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            Customer Item IDs
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The customer&apos;s own item numbers on non-standard quotations. Every saved non-standard quotation adds its IDs here; edit the description to improve the suggestion next time.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Item ID</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">Loading...</div>
        ) : (
          <DataTable columns={columns} data={rows} searchKey="itemNo" searchPlaceholder="Search by item ID..." pageSize={25} />
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Item ID" : "Add Item ID"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Item ID *</Label>
              <Input value={form.itemNo} onChange={(e) => setForm((f) => ({ ...f, itemNo: e.target.value }))} placeholder="e.g. 10, 6000061996" className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={5} className="font-mono text-xs" placeholder="Fills the item description when this ID is picked on a quotation" />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={form.unit || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, unit: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item ID?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.itemNo}&quot; for {deleteTarget?.customer?.name} will no longer be suggested. Quotations already carrying it are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
