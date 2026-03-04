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

interface LengthEntry {
  id: string;
  label: string;
}

export default function EditLengthPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [length, setLength] = useState<LengthEntry | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/masters/lengths");
        if (!res.ok) throw new Error("Failed to fetch lengths");
        const data = await res.json();
        const found = (data.lengths || []).find((l: LengthEntry) => l.id === id);

        if (!found) {
          toast.error("Length not found");
          router.push("/masters/lengths");
          return;
        }

        setLength(found);
        setLabel(found.label);
      } catch {
        toast.error("Failed to load length data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/masters/lengths/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update length");
        return;
      }

      toast.success("Length updated successfully");
      router.push("/masters/lengths");
    } catch {
      toast.error("Failed to update length");
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
        title="Edit Length"
        description={length ? `Editing: ${length.label}` : "Update pipe length option"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/lengths")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="length-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <form id="length-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Length</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 5.00-7.00 Mtr"
                required
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
