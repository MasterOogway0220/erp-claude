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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const FLANGE_TYPES = ["Weld Neck", "Slip On", "Blind", "Socket Weld", "Lap Joint", "Threaded"];
const FLANGE_RATINGS = ["150", "300", "600", "900", "1500", "2500"];
const FLANGE_FACINGS = ["RF", "FF", "RTJ"];

interface FlangeFormData {
  type: string;
  size: string;
  rating: string;
  facing: string;
  materialGrade: string;
  standard: string;
  schedule: string;
  description: string;
}

const emptyForm: FlangeFormData = {
  type: "Weld Neck",
  size: "",
  rating: "150",
  facing: "",
  materialGrade: "",
  standard: "",
  schedule: "",
  description: "",
};

export default function CreateFlangePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FlangeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof FlangeFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) {
      toast.error("Type is required");
      return;
    }
    if (!formData.size.trim()) {
      toast.error("Size is required");
      return;
    }
    if (!formData.rating) {
      toast.error("Rating is required");
      return;
    }
    if (!formData.materialGrade.trim()) {
      toast.error("Material grade is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/masters/flanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create flange");
        return;
      }

      toast.success("Flange created successfully");
      router.push("/masters/flanges");
    } catch {
      toast.error("Failed to create flange");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Flange" description="Create a new flange specification">
        <Button variant="outline" onClick={() => router.push("/masters/flanges")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="flange-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Flange"}
        </Button>
      </PageHeader>

      <form id="flange-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Flange Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => update("type", v)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLANGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => update("size", e.target.value)}
                placeholder='e.g. 4"'
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rating">Rating *</Label>
              <Select
                value={formData.rating}
                onValueChange={(v) => update("rating", v)}
              >
                <SelectTrigger id="rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLANGE_RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>{r}#</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="facing">Facing</Label>
              <Select
                value={formData.facing || "__none__"}
                onValueChange={(v) => update("facing", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="facing">
                  <SelectValue placeholder="Select facing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {FLANGE_FACINGS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materialGrade">Material Grade *</Label>
              <Input
                id="materialGrade"
                value={formData.materialGrade}
                onChange={(e) => update("materialGrade", e.target.value)}
                placeholder="e.g. ASTM A105"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="standard">Standard</Label>
              <Input
                id="standard"
                value={formData.standard}
                onChange={(e) => update("standard", e.target.value)}
                placeholder="e.g. ASME B16.5"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => update("schedule", e.target.value)}
                placeholder="e.g. 40, 80"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
