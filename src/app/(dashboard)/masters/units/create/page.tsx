"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface UnitFormData {
  code: string;
  name: string;
  isActive: boolean;
}

const emptyForm: UnitFormData = {
  code: "",
  name: "",
  isActive: true,
};

export default function CreateUnitPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<UnitFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

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
      const res = await fetch("/api/masters/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create unit");
        return;
      }

      toast.success("Unit created successfully");
      router.push("/masters/units");
    } catch {
      toast.error("Failed to create unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Unit" description="Create a new unit of measurement">
        <Button variant="outline" onClick={() => router.push("/masters/units")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="unit-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Unit"}
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
