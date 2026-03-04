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

const FLANGE_TYPES = ["Weld Neck", "Slip On", "Blind", "Socket Weld", "Lap Joint", "Threaded"];
const FLANGE_RATINGS = ["150", "300", "600", "900", "1500", "2500"];
const FLANGE_FACINGS = ["RF", "FF", "RTJ"];

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
}

export default function EditFlangePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [flange, setFlange] = useState<Flange | null>(null);
  const [formData, setFormData] = useState<FlangeFormData>({
    type: "Weld Neck",
    size: "",
    rating: "150",
    facing: "",
    materialGrade: "",
    standard: "",
    schedule: "",
    description: "",
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

        if (!found) {
          toast.error("Flange not found");
          router.push("/masters/products");
          return;
        }

        setFlange(found);
        setFormData({
          type: found.type,
          size: found.size,
          rating: found.rating,
          facing: found.facing || "",
          materialGrade: found.materialGrade,
          standard: found.standard || "",
          schedule: found.schedule || "",
          description: found.description || "",
        });
      } catch {
        toast.error("Failed to load flange data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      const res = await fetch(`/api/masters/flanges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update flange");
        return;
      }

      toast.success("Flange updated successfully");
      router.push("/masters/products");
    } catch {
      toast.error("Failed to update flange");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Flange"
        description={flange ? `Editing: ${flange.type} - ${flange.size} - ${flange.rating}#` : "Update flange specification"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="flange-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
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
