"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface Unit {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface UnitFormData {
  code: string;
  name: string;
  isActive: boolean;
}

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    code: "",
    name: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/masters/units");
        if (!res.ok) throw new Error("Failed to fetch units");
        const data = await res.json();
        const found = (data.units || []).find((u: Unit) => u.id === id);

        if (!found) {
          toast.error("Unit not found");
          router.push("/masters/products");
          return;
        }

        setUnit(found);
        setFormData({
          code: found.code,
          name: found.name,
          isActive: found.isActive,
        });
      } catch {
        toast.error("Failed to load unit data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = (field: keyof UnitFormData, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/masters/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update unit");
        return;
      }

      toast.success("Unit updated successfully");
      router.push("/masters/products");
    } catch {
      toast.error("Failed to update unit");
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
        title="Edit Unit"
        description={unit ? `Editing: ${unit.code} - ${unit.name}` : "Update unit of measurement"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="unit-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => update("code", e.target.value)}
                placeholder='e.g. Kg, Pcs, Mtr'
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder='e.g. Kilogram, Pieces, Meter'
                required
              />
            </div>

            <div>
              <Label className="mb-2 block">Status</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === true}
                    onChange={() => update("isActive", true)}
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === false}
                    onChange={() => update("isActive", false)}
                  />
                  <span className="text-sm">Inactive</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
