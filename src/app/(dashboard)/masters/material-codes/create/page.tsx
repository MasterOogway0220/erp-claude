"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Package } from "lucide-react";
import { toast } from "sonner";

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
  code: "", clientItemCode: "", description: "", productType: "",
  materialGrade: "", size: "", odSize: "", nbSize: "", thickness: "",
  schedule: "", standard: "", unit: "", rate: "",
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

export default function CreateMaterialCodePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "odSize" || field === "nbSize" || field === "thickness") {
        const od = field === "odSize" ? value : prev.odSize;
        const nb = field === "nbSize" ? value : prev.nbSize;
        const thick = field === "thickness" ? value : prev.thickness;
        const parts: string[] = [];
        if (nb) parts.push(`${nb} NB`);
        if (od) parts.push(`OD ${od}`);
        if (thick) parts.push(`WT ${thick}`);
        next.size = parts.join(" x ");
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) { toast.error("Item Code is required"); return; }
    setSaving(true);
    try {
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
      router.push("/masters/material-codes");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Item / Material Code" description="Create a new material code entry">
        <Button variant="outline" onClick={() => router.push("/masters/material-codes")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button type="submit" form="mc-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Item Code"}
        </Button>
      </PageHeader>

      <form id="mc-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Identification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" /> Identification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Item Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                  placeholder="e.g., MC-PIPE-CS-001"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Internal material code</p>
              </div>
              <div className="space-y-1.5">
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
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="productType">Product Type</Label>
                <Input
                  id="productType"
                  value={formData.productType}
                  onChange={(e) => updateField("productType", e.target.value)}
                  placeholder="e.g., Seamless Pipe, ERW Pipe, Elbow"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="materialGrade">Material Grade</Label>
                <Input
                  id="materialGrade"
                  value={formData.materialGrade}
                  onChange={(e) => updateField("materialGrade", e.target.value)}
                  placeholder="e.g., SS316L, ASTM A106 GR B"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Size & Specification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Size & Specification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nbSize">NB (Nominal Bore)</Label>
                <Input id="nbSize" value={formData.nbSize} onChange={(e) => updateField("nbSize", e.target.value)} placeholder='e.g., 2", 4"' />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="odSize">OD (Outer Diameter)</Label>
                <Input id="odSize" value={formData.odSize} onChange={(e) => updateField("odSize", e.target.value)} placeholder="e.g., 60.3mm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="thickness">Thickness (WT)</Label>
                <Input id="thickness" value={formData.thickness} onChange={(e) => updateField("thickness", e.target.value)} placeholder="e.g., 3.91mm" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="size">Size Label</Label>
                <Input id="size" value={formData.size} onChange={(e) => updateField("size", e.target.value)} placeholder="Auto-composed from NB/OD/WT" className="bg-muted/30" />
                <p className="text-xs text-muted-foreground">Auto-composed or override manually</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule">Schedule</Label>
                <Select value={formData.schedule} onValueChange={(v) => updateField("schedule", v)}>
                  <SelectTrigger id="schedule"><SelectValue placeholder="Select schedule" /></SelectTrigger>
                  <SelectContent>{SCHEDULES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="standard">Standard</Label>
                <Select value={formData.standard} onValueChange={(v) => updateField("standard", v)}>
                  <SelectTrigger id="standard"><SelectValue placeholder="Select standard" /></SelectTrigger>
                  <SelectContent>{STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Unit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pricing & Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit of Measurement</Label>
                <Select value={formData.unit} onValueChange={(v) => updateField("unit", v)}>
                  <SelectTrigger id="unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
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
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
