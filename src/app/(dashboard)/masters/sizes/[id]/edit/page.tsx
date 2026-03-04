"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { PageLoading } from "@/components/shared/page-loading";

type PipeType = "CS_AS" | "SS_DS";

interface SizeEntry {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: PipeType;
}

interface SizeFormData {
  sizeLabel: string;
  pipeType: PipeType;
  od: string;
  wt: string;
  weight: string;
}

function calcWeight(od: string, wt: string): string {
  const odVal = parseFloat(od);
  const wtVal = parseFloat(wt);
  if (odVal > 0 && wtVal > 0) {
    const w = (odVal - wtVal) * wtVal * 0.0246615;
    return w.toFixed(4);
  }
  return "";
}

export default function EditSizePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [size, setSize] = useState<SizeEntry | null>(null);
  const [formData, setFormData] = useState<SizeFormData>({
    sizeLabel: "",
    pipeType: "CS_AS",
    od: "",
    wt: "",
    weight: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/masters/sizes");
        if (!res.ok) throw new Error("Failed to fetch sizes");
        const data = await res.json();
        const found = (data.sizes || []).find((s: SizeEntry) => s.id === id);

        if (!found) {
          toast.error("Size not found");
          router.push("/masters/sizes");
          return;
        }

        setSize(found);
        setFormData({
          sizeLabel: found.sizeLabel,
          pipeType: found.pipeType,
          od: found.od.toString(),
          wt: found.wt.toString(),
          weight: found.weight.toString(),
        });
      } catch {
        toast.error("Failed to load size data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOdChange = (od: string) => {
    const calculated = calcWeight(od, formData.wt);
    setFormData((prev) => ({
      ...prev,
      od,
      weight: calculated || prev.weight,
    }));
  };

  const handleWtChange = (wt: string) => {
    const calculated = calcWeight(formData.od, wt);
    setFormData((prev) => ({
      ...prev,
      wt,
      weight: calculated || prev.weight,
    }));
  };

  const handlePipeTypeChange = (pipeType: PipeType) => {
    const calculated = calcWeight(formData.od, formData.wt);
    setFormData((prev) => ({
      ...prev,
      pipeType,
      weight: calculated || prev.weight,
    }));
  };

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
      const res = await fetch(`/api/masters/sizes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update size");
        return;
      }

      toast.success("Size updated successfully");
      router.push("/masters/sizes");
    } catch {
      toast.error("Failed to update size");
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
        title="Edit Size"
        description={size ? `Editing: ${size.sizeLabel}` : "Update pipe size specification"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/sizes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="size-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
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
                onValueChange={(value: PipeType) => handlePipeTypeChange(value)}
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
                  onChange={(e) => handleOdChange(e.target.value)}
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
                  onChange={(e) => handleWtChange(e.target.value)}
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
