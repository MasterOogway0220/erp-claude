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

const FITTING_TYPES = ["Elbow", "Tee", "Reducer", "Cap", "Coupling", "Union", "Nipple", "Bush"];
const END_TYPES = ["BW", "SW", "Threaded"];

interface FittingFormData {
  type: string;
  size: string;
  schedule: string;
  endType: string;
  rating: string;
  materialGrade: string;
  standard: string;
  description: string;
}

const emptyForm: FittingFormData = {
  type: "Elbow",
  size: "",
  schedule: "",
  endType: "",
  rating: "",
  materialGrade: "",
  standard: "",
  description: "",
};

export default function CreateFittingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FittingFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const showRating = formData.endType === "SW" || formData.endType === "Threaded";

  const update = (field: keyof FittingFormData, value: string) =>
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
    if (!formData.materialGrade.trim()) {
      toast.error("Material grade is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/masters/fittings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create fitting");
        return;
      }

      toast.success("Fitting created successfully");
      router.refresh();
      router.push("/masters/products?tab=fittings");
    } catch {
      toast.error("Failed to create fitting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Fitting" description="Create a new fitting specification">
        <Button variant="outline" onClick={() => router.push("/masters/products?tab=fittings")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="fitting-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Fitting"}
        </Button>
      </PageHeader>

      <form id="fitting-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fitting Details</CardTitle>
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
                  {FITTING_TYPES.map((t) => (
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
                placeholder='e.g. 2"'
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => update("schedule", e.target.value)}
                placeholder="e.g. SCH 40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endType">End Type</Label>
              <Select
                value={formData.endType || "__none__"}
                onValueChange={(v) => update("endType", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="endType">
                  <SelectValue placeholder="Select end type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {END_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showRating && (
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  value={formData.rating}
                  onChange={(e) => update("rating", e.target.value)}
                  placeholder="e.g. 3000#"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="materialGrade">Material Grade *</Label>
              <Input
                id="materialGrade"
                value={formData.materialGrade}
                onChange={(e) => update("materialGrade", e.target.value)}
                placeholder="e.g. ASTM A234 WPB"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="standard">Standard</Label>
              <Input
                id="standard"
                value={formData.standard}
                onChange={(e) => update("standard", e.target.value)}
                placeholder="e.g. ASME B16.9"
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
