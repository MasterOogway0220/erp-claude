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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentTerm {
  id: string; code: string | null; name: string; description: string | null;
  days: number; isActive: boolean;
}
interface DeliveryTerm {
  id: string; code: string | null; name: string; description: string | null;
  incoterms: string | null; isActive: boolean;
}
interface TaxRate {
  id: string; code: string | null; name: string; percentage: number | string;
  taxType: string | null; hsnCode: string | null; effectiveFrom: string | null;
  effectiveTo: string | null; isActive: boolean;
}
interface InspectionAgency {
  id: string; code: string; name: string; contactPerson: string | null;
  phone: string | null; email: string | null; address: string | null;
  accreditationDetails: string | null; approvedStatus: boolean; isActive: boolean;
}

const TAX_TYPES = ["GST", "IGST", "CGST", "SGST", "ZERO_RATED"];

// ─── Status Radio ──────────────────────────────────────────────────────────────

function StatusRadio({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 pt-1">
      {[true, false].map((v) => (
        <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={value === v} onChange={() => onChange(v)} />
          <span className="text-sm">{v ? "Active" : "Inactive"}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ items }: { items: { label: string; value: number; color?: string }[] }) {
  return (
    <div className={`grid gap-4 md:grid-cols-${items.length}`}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${item.color ?? ""}`}>{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT TERMS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PaymentTermsTab() {
  const emptyForm = { code: "", name: "", description: "", days: 30, isActive: true };
  const [items, setItems] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTerm | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/payment-terms");
      const data = await res.json();
      setItems(data.paymentTerms || []);
    } catch { toast.error("Failed to load payment terms"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: PaymentTerm) => {
    setEditing(item);
    setForm({ code: item.code || "", name: item.name, description: item.description || "", days: item.days, isActive: item.isActive });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/masters/payment-terms/${editing.id}` : "/api/masters/payment-terms";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save"); }
      toast.success(editing ? "Payment term updated" : "Payment term created");
      closeDialog(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: PaymentTerm) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/masters/payment-terms/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      toast.success("Payment term deleted"); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const columns: Column<PaymentTerm>[] = [
    { key: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono font-medium">{r.code || "--"}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "description", header: "Description", cell: (r) => r.description || "--" },
    { key: "days", header: "Credit Days", sortable: true, cell: (r) => <Badge variant="outline">{r.days} days</Badge> },
    { key: "isActive", header: "Status", cell: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions" as any, header: "Actions", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SummaryCards items={[
          { label: "Total", value: items.length },
          { label: "Active", value: items.filter(i => i.isActive).length, color: "text-green-600" },
          { label: "Inactive", value: items.filter(i => !i.isActive).length, color: "text-muted-foreground" },
        ]} />
        <Button onClick={openCreate} className="ml-4 shrink-0"><Plus className="h-4 w-4 mr-2" />Add Payment Term</Button>
      </div>

      {loading ? <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading...</div>
        : <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search payment terms..." pageSize={15} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Payment Term</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder='e.g., "NET30"' />
              </div>
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='e.g., "Net 30 Days"' required />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Credit Days *</Label>
                <Input type="number" min={0} value={form.days} onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 0 })} required />
              </div>
              <div className="grid gap-2"><Label>Status</Label><StatusRadio value={form.isActive} onChange={v => setForm({ ...form, isActive: v })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY TERMS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DeliveryTermsTab() {
  const emptyForm = { code: "", name: "", description: "", incoterms: "", isActive: true };
  const [items, setItems] = useState<DeliveryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryTerm | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/delivery-terms");
      const data = await res.json();
      setItems(data.deliveryTerms || []);
    } catch { toast.error("Failed to load delivery terms"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: DeliveryTerm) => {
    setEditing(item);
    setForm({ code: item.code || "", name: item.name, description: item.description || "", incoterms: item.incoterms || "", isActive: item.isActive });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/masters/delivery-terms/${editing.id}` : "/api/masters/delivery-terms";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save"); }
      toast.success(editing ? "Delivery term updated" : "Delivery term created");
      closeDialog(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: DeliveryTerm) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/masters/delivery-terms/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      toast.success("Delivery term deleted"); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const columns: Column<DeliveryTerm>[] = [
    { key: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono font-medium">{r.code || "--"}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "description", header: "Description", cell: (r) => r.description || "--" },
    { key: "incoterms", header: "Incoterms", cell: (r) => r.incoterms ? <Badge variant="outline">{r.incoterms}</Badge> : "--" },
    { key: "isActive", header: "Status", cell: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions" as any, header: "Actions", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SummaryCards items={[
          { label: "Total", value: items.length },
          { label: "Active", value: items.filter(i => i.isActive).length, color: "text-green-600" },
          { label: "Inactive", value: items.filter(i => !i.isActive).length, color: "text-muted-foreground" },
        ]} />
        <Button onClick={openCreate} className="ml-4 shrink-0"><Plus className="h-4 w-4 mr-2" />Add Delivery Term</Button>
      </div>

      {loading ? <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading...</div>
        : <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search delivery terms..." pageSize={15} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Delivery Term</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder='e.g., "EXW"' /></div>
              <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='e.g., "Ex-Works"' required /></div>
              <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="grid gap-2"><Label>Incoterms</Label><Input value={form.incoterms} onChange={e => setForm({ ...form, incoterms: e.target.value })} placeholder='e.g., "EXW", "FOB", "CIF"' /></div>
              <div className="grid gap-2"><Label>Status</Label><StatusRadio value={form.isActive} onChange={v => setForm({ ...form, isActive: v })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAX RATES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function TaxRatesTab() {
  const emptyForm = { code: "", name: "", percentage: "", taxType: "", hsnCode: "", effectiveFrom: "", effectiveTo: "", isActive: true };
  const [items, setItems] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/tax");
      const data = await res.json();
      setItems(data.taxRates || []);
    } catch { toast.error("Failed to load tax rates"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: TaxRate) => {
    setEditing(item);
    setForm({
      code: item.code || "", name: item.name, percentage: String(item.percentage),
      taxType: item.taxType || "", hsnCode: item.hsnCode || "",
      effectiveFrom: item.effectiveFrom ? format(new Date(item.effectiveFrom), "yyyy-MM-dd") : "",
      effectiveTo: item.effectiveTo ? format(new Date(item.effectiveTo), "yyyy-MM-dd") : "",
      isActive: item.isActive,
    });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.percentage) { toast.error("Name and percentage are required"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/masters/tax/${editing.id}` : "/api/masters/tax";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, percentage: parseFloat(form.percentage), taxType: form.taxType || null, effectiveFrom: form.effectiveFrom || null, effectiveTo: form.effectiveTo || null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save"); }
      toast.success(editing ? "Tax rate updated" : "Tax rate created");
      closeDialog(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: TaxRate) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/masters/tax/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      toast.success("Tax rate deleted"); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const taxBadgeColor = (t: string | null) => ({ CGST: "bg-blue-500", SGST: "bg-indigo-500", IGST: "bg-purple-500", ZERO_RATED: "bg-gray-500" }[t ?? ""] ?? "bg-slate-500");

  const columns: Column<TaxRate>[] = [
    { key: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono font-medium">{r.code || "--"}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "percentage", header: "Rate (%)", sortable: true, cell: (r) => <span className="font-medium">{Number(r.percentage).toFixed(2)}%</span> },
    { key: "taxType", header: "Tax Type", cell: (r) => r.taxType ? <Badge className={taxBadgeColor(r.taxType)}>{r.taxType}</Badge> : "--" },
    { key: "hsnCode", header: "HSN Code", cell: (r) => r.hsnCode ? <span className="font-mono text-sm">{r.hsnCode}</span> : "--" },
    { key: "isActive", header: "Status", cell: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions" as any, header: "Actions", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SummaryCards items={[
          { label: "Total", value: items.length },
          { label: "Active", value: items.filter(i => i.isActive).length, color: "text-green-600" },
          { label: "GST Rates", value: items.filter(i => ["CGST","SGST","IGST","GST"].includes(i.taxType || "")).length, color: "text-blue-600" },
          { label: "Zero Rated", value: items.filter(i => i.taxType === "ZERO_RATED").length, color: "text-muted-foreground" },
        ]} />
        <Button onClick={openCreate} className="ml-4 shrink-0"><Plus className="h-4 w-4 mr-2" />Add Tax Rate</Button>
      </div>

      {loading ? <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading...</div>
        : <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search tax rates..." pageSize={15} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Tax Rate</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder='e.g., "GST18"' /></div>
                <div className="grid gap-2"><Label>Rate (%) *</Label><Input type="number" step="0.01" min="0" max="100" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} required /></div>
              </div>
              <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='e.g., "GST 18%"' required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tax Type</Label>
                  <Select value={form.taxType} onValueChange={v => setForm({ ...form, taxType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{TAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>HSN Code</Label><Input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} placeholder="73044900" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Effective From</Label><Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Effective To</Label><Input type="date" value={form.effectiveTo} onChange={e => setForm({ ...form, effectiveTo: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Status</Label><StatusRadio value={form.isActive} onChange={v => setForm({ ...form, isActive: v })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSPECTION AGENCIES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function InspectionAgenciesTab() {
  const emptyForm = { code: "", name: "", contactPerson: "", phone: "", email: "", address: "", accreditationDetails: "", approvedStatus: true, isActive: true };
  const [items, setItems] = useState<InspectionAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionAgency | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/inspection-agencies");
      const data = await res.json();
      setItems(data.agencies || []);
    } catch { toast.error("Failed to load inspection agencies"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: InspectionAgency) => {
    setEditing(item);
    setForm({ code: item.code, name: item.name, contactPerson: item.contactPerson || "", phone: item.phone || "", email: item.email || "", address: item.address || "", accreditationDetails: item.accreditationDetails || "", approvedStatus: item.approvedStatus, isActive: item.isActive });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { toast.error("Code and Name are required"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/masters/inspection-agencies/${editing.id}` : "/api/masters/inspection-agencies";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save"); }
      toast.success(editing ? "Agency updated" : "Agency created");
      closeDialog(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: InspectionAgency) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/masters/inspection-agencies/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      toast.success("Agency deleted"); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const columns: Column<InspectionAgency>[] = [
    { key: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono font-medium">{r.code}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "contactPerson", header: "Contact Person", cell: (r) => r.contactPerson || "--" },
    { key: "phone", header: "Phone", cell: (r) => r.phone || "--" },
    { key: "approvedStatus", header: "Approved", cell: (r) => <Badge variant={r.approvedStatus ? "default" : "destructive"} className={r.approvedStatus ? "bg-green-500" : ""}>{r.approvedStatus ? "Approved" : "Not Approved"}</Badge> },
    { key: "isActive", header: "Status", cell: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions" as any, header: "Actions", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SummaryCards items={[
          { label: "Total", value: items.length },
          { label: "Active", value: items.filter(i => i.isActive).length, color: "text-green-600" },
          { label: "Approved", value: items.filter(i => i.approvedStatus).length, color: "text-blue-600" },
          { label: "Inactive", value: items.filter(i => !i.isActive).length, color: "text-muted-foreground" },
        ]} />
        <Button onClick={openCreate} className="ml-4 shrink-0"><Plus className="h-4 w-4 mr-2" />Add Agency</Button>
      </div>

      {loading ? <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading...</div>
        : <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search agencies..." pageSize={15} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Inspection Agency</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="TPI-001" required /></div>
                <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agency name" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Address</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
              <div className="grid gap-2"><Label>Accreditation Details</Label><Textarea value={form.accreditationDetails} onChange={e => setForm({ ...form, accreditationDetails: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Approved Status</Label>
                  <div className="flex items-center gap-4 pt-1">
                    {[true, false].map(v => (
                      <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.approvedStatus === v} onChange={() => setForm({ ...form, approvedStatus: v })} />
                        <span className="text-sm">{v ? "Approved" : "Not Approved"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2"><Label>Status</Label><StatusRadio value={form.isActive} onChange={v => setForm({ ...form, isActive: v })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function TermsConditionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms & Conditions Master"
        description="Manage payment terms, delivery terms, tax rates, and inspection agencies"
      />
      <Tabs defaultValue="payment-terms">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payment-terms">Payment Terms</TabsTrigger>
          <TabsTrigger value="delivery-terms">Delivery Terms</TabsTrigger>
          <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="inspection-agencies">Inspection Agencies</TabsTrigger>
        </TabsList>
        <TabsContent value="payment-terms" className="mt-6"><PaymentTermsTab /></TabsContent>
        <TabsContent value="delivery-terms" className="mt-6"><DeliveryTermsTab /></TabsContent>
        <TabsContent value="tax-rates" className="mt-6"><TaxRatesTab /></TabsContent>
        <TabsContent value="inspection-agencies" className="mt-6"><InspectionAgenciesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
