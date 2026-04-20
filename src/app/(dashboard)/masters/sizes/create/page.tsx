"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PipeType = "CS_AS" | "SS_DS";

interface SizeFormData {
  sizeLabel: string;
  pipeType: PipeType;
  od: string;
  wt: string;
  weight: string;
}

const emptyForm: SizeFormData = {
  sizeLabel: "",
  pipeType: "CS_AS",
  od: "",
  wt: "",
  weight: "",
};

function calcWeight(od: string, wt: string): string {
  const odVal = parseFloat(od);
  const wtVal = parseFloat(wt);
  if (odVal > 0 && wtVal > 0) {
    const w = (odVal - wtVal) * wtVal * 0.0246615;
    return w.toFixed(4);
  }
  return "";
}

export default function CreateSizePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SizeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const calculated = calcWeight(formData.od, formData.wt);
    if (calculated) {
      setFormData((prev) => ({ ...prev, weight: calculated }));
    }
  }, [formData.od, formData.wt, formData.pipeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sizeLabel.trim()) {
      toast.error("Size label is required");
      return;
    }
    if (!formData.od) {
      toast.error("OD is required");
      return;
    }
    if (!formData.wt) {
      toast.error("WT is required");
      return;
    }
    if (!formData.weight) {
      toast.error("Weight is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/masters/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create size");
        return;
      }

      toast.success("Size created successfully");
      router.push("/masters/products?tab=sizes");
    } catch {
      toast.error("Failed to create size");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Size" description="Create a new pipe size specification">
        <Button variant="outline" onClick={() => router.push("/masters/products?tab=sizes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="size-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Size"}
        </Button>
      </PageHeader>

      <form id="size-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipe Size Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sizeLabel">Size Label *</Label>
              <Input
                id="sizeLabel"
                value={formData.sizeLabel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sizeLabel: e.target.value }))
                }
                placeholder='e.g. 2" SCH 40'
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeType">Pipe Type *</Label>
              <Select
                value={formData.pipeType}
                onValueChange={(value: PipeType) =>
                  setFormData((prev) => ({ ...prev, pipeType: value }))
                }
              >
                <SelectTrigger id="pipeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CS_AS">CS &amp; AS Pipes</SelectItem>
                  <SelectItem value="SS_DS">SS &amp; DS Pipes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="od">OD (mm) *</Label>
                <Input
                  id="od"
                  type="number"
                  step="0.001"
                  value={formData.od}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, od: e.target.value }))
                  }
                  placeholder="21.3"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wt">WT (mm) *</Label>
                <Input
                  id="wt"
                  type="number"
                  step="0.001"
                  value={formData.wt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wt: e.target.value }))
                  }
                  placeholder="2.77"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="weight">Weight (kg/m)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.0001"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weight: e.target.value }))
                  }
                  placeholder="1.2661"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated: (OD - WT) &times; WT &times; 0.0246615
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
