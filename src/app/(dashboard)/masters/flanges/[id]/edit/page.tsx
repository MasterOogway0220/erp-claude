"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import {
  FLANGE_TYPES_B165,
  FLANGE_TYPES_B1647,
  FLANGE_RATINGS,
  FLANGE_FACINGS,
  ALL_FLANGE_SIZES,
  SCHEDULES_SS_DS,
  SCHEDULES_CS_AS,
  getAllowedFacings,
  isScheduleApplicable,
  getStandardForSize,
} from "@/lib/flange-constants";

interface Flange {
  id: string;
  type: string;
  size: string;
  rating: string;
  materialGrade: string;
  standard: string | null;
  facing: string | null;
  schedule: string | null;
  description: string | null;
  isActive: boolean;
}

interface FlangeFormData {
  type: string;
  size: string;
  rating: string;
  facing: string;
  materialGrade: string;
  standard: string;
  schedule: string;
  description: string;
  pipeCategory: string;
}

export default function EditFlangePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [flange, setFlange] = useState<Flange | null>(null);
  const [formData, setFormData] = useState<FlangeFormData>({
    type: "Weld Neck", size: "", rating: "150", facing: "", materialGrade: "",
    standard: "", schedule: "", description: "", pipeCategory: "CS_AS",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/masters/flanges");
        if (!res.ok) throw new Error("Failed to fetch flanges");
        const data = await res.json();
        const found = (data.flanges || []).find((f: Flange) => f.id === id);
        if (!found) { toast.error("Flange not found"); router.push("/masters/products"); return; }
        setFlange(found);
        const sch = found.schedule || "";
        const isSSDS = sch.includes("S") && !sch.includes("STD") && !sch.includes("XXS");
        setFormData({
          type: found.type, size: found.size, rating: found.rating,
          facing: found.facing || "", materialGrade: found.materialGrade,
          standard: found.standard || getStandardForSize(found.size),
          schedule: found.schedule || "", description: found.description || "",
          pipeCategory: isSSDS ? "SS_DS" : "CS_AS",
        });
      } catch { toast.error("Failed to load flange data"); }
      finally { setLoading(false); }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = (field: keyof FlangeFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const isLargeFlange = formData.standard.includes("B16.47");
  const flangeTypes = isLargeFlange ? FLANGE_TYPES_B1647 : FLANGE_TYPES_B165;
  const allowedFacingValues = getAllowedFacings(formData.rating, formData.standard);
  const scheduleApplicable = isScheduleApplicable(formData.type, formData.facing);
  const scheduleOptions = formData.pipeCategory === "SS_DS" ? SCHEDULES_SS_DS : SCHEDULES_CS_AS;

  const handleSizeChange = (size: string) => {
    const std = getStandardForSize(size);
    const updates: Partial<FlangeFormData> = { size, standard: std };
    if (std.includes("B16.47") && !["Weld Neck", "Blind"].includes(formData.type)) {
      updates.type = "Weld Neck";
    }
    const newAllowed = getAllowedFacings(formData.rating, std);
    if (formData.facing && !newAllowed.includes(formData.facing)) updates.facing = "";
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleRatingChange = (rating: string) => {
    const newAllowed = getAllowedFacings(rating, formData.standard);
    const updates: Partial<FlangeFormData> = { rating };
    if (formData.facing && !newAllowed.includes(formData.facing)) updates.facing = "";
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) { toast.error("Type is required"); return; }
    if (!formData.size) { toast.error("Size is required"); return; }
    if (!formData.rating) { toast.error("Rating is required"); return; }
    if (!formData.materialGrade.trim()) { toast.error("Material grade is required"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/masters/flanges/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || "Failed to update flange"); return; }
      toast.success("Flange updated successfully");
      router.push("/masters/products");
    } catch { toast.error("Failed to update flange"); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Flange"
        description={flange ? `Editing: ${flange.type} - ${flange.size} - ${flange.rating}#` : "Update flange specification"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button type="submit" form="flange-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <form id="flange-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Flange Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Size *</Label>
                <Select value={formData.size || "__none__"} onValueChange={(v) => handleSizeChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select size</SelectItem>
                    {ALL_FLANGE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Dimension Standard</Label>
                <Input value={formData.standard} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {flangeTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Class (Rating) *</Label>
                <Select value={formData.rating} onValueChange={handleRatingChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLANGE_RATINGS.map((r) => (
                      <SelectItem key={r} value={r}>{r}#</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Facing</Label>
                <Select value={formData.facing || "__none__"} onValueChange={(v) => update("facing", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select facing" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {FLANGE_FACINGS.filter((f) => allowedFacingValues.includes(f.value)).map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Material Grade *</Label>
                <Input value={formData.materialGrade} onChange={(e) => update("materialGrade", e.target.value)} placeholder="e.g. ASTM A105" required />
              </div>
            </div>

            {scheduleApplicable && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Pipe Category (for Schedule)</Label>
                  <Select value={formData.pipeCategory} onValueChange={(v) => { update("pipeCategory", v); update("schedule", ""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CS_AS">CS / AS Flanges</SelectItem>
                      <SelectItem value="SS_DS">SS / DS Flanges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Thickness (Schedule)</Label>
                  <Select value={formData.schedule || "__none__"} onValueChange={(v) => update("schedule", v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- None --</SelectItem>
                      {scheduleOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional description" rows={3} />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
