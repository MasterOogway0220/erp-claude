"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TPIAgency {
  id: string;
  name: string;
  code: string;
}

const TEST_TYPES = [
  { value: "HYDRO", label: "Hydro Test" },
  { value: "CHEMICAL", label: "Chemical Analysis" },
  { value: "MECHANICAL", label: "Mechanical Testing" },
  { value: "IGC", label: "IGC (Intergranular Corrosion)" },
  { value: "IMPACT", label: "Impact Test" },
];

const INSPECTION_LOCATIONS = [
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "LAB", label: "Laboratory" },
];

export default function CreateQualityRequirementPage() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<TPIAgency[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    parameter: "",
    value: "",
    colourCodingRequired: false,
    inspectionRequired: false,
    tpiAgencyId: "",
    testingRequired: false,
    testType: "",
    inspectionLocation: "",
    qapDocumentPath: "",
    remarks: "",
  });

  useEffect(() => {
    fetch("/api/masters/inspection-agencies")
      .then((res) => (res.ok ? res.json() : { agencies: [] }))
      .then((data) => setAgencies(data.agencies || []))
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: uploadData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setFormData((prev) => ({ ...prev, qapDocumentPath: result.filePath }));
      toast.success(`Uploaded: ${file.name}`);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parameter.trim()) {
      toast.error("Parameter name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        tpiAgencyId: formData.tpiAgencyId || null,
        testType: formData.testingRequired ? formData.testType || null : null,
        inspectionLocation: formData.inspectionRequired ? formData.inspectionLocation || null : null,
      };

      const res = await fetch("/api/quality/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }

      toast.success("Quality requirement created");
      router.push("/quality/requirements");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Quality Requirement"
        description="Define a new quality requirement as per QAP"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Parameter Definition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="parameter">
                  Parameter <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="parameter"
                  value={formData.parameter}
                  onChange={(e) => setFormData((prev) => ({ ...prev, parameter: e.target.value }))}
                  placeholder="e.g., Hardness, Chemical Composition, Surface Finish"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">Value / Specification</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g., HB 217 max, Ra 3.2 μm, As per ASTM A312"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Additional notes or special instructions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Colour Coding</Label>
                    <p className="text-xs text-muted-foreground">Colour marking required</p>
                  </div>
                  <Switch
                    checked={formData.colourCodingRequired}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, colourCodingRequired: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Inspection</Label>
                    <p className="text-xs text-muted-foreground">Physical inspection needed</p>
                  </div>
                  <Switch
                    checked={formData.inspectionRequired}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        inspectionRequired: checked,
                        inspectionLocation: checked ? prev.inspectionLocation : "",
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Testing</Label>
                    <p className="text-xs text-muted-foreground">Lab/field testing needed</p>
                  </div>
                  <Switch
                    checked={formData.testingRequired}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        testingRequired: checked,
                        testType: checked ? prev.testType : "",
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspection & Testing Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Inspection Location</Label>
                  <Select
                    value={formData.inspectionLocation || "NONE"}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, inspectionLocation: v === "NONE" ? "" : v }))
                    }
                    disabled={!formData.inspectionRequired}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {INSPECTION_LOCATIONS.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>TPI Agency</Label>
                  <Select
                    value={formData.tpiAgencyId || "NONE"}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, tpiAgencyId: v === "NONE" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select TPI agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name} ({agency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {agencies.length === 0 && (
                    <p className="text-xs text-muted-foreground">No inspection agencies configured</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Test Type</Label>
                  <Select
                    value={formData.testType || "NONE"}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, testType: v === "NONE" ? "" : v }))
                    }
                    disabled={!formData.testingRequired}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {TEST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QAP Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById("qap-file-input")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Choose File"}
                  </Button>
                  <input
                    id="qap-file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  {formData.qapDocumentPath && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <FileText className="h-3.5 w-3.5" />
                      <a
                        href={formData.qapDocumentPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View uploaded
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive"
                        onClick={() => setFormData((prev) => ({ ...prev, qapDocumentPath: "" }))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, DOC, XLS, or image (max 10MB)
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Requirement"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
