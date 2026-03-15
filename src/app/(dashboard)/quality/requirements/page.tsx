"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TPIAgency {
  id: string;
  name: string;
  code: string;
}

interface QualityRequirement {
  id: string;
  companyId: string | null;
  parameter: string;
  value: string | null;
  colourCodingRequired: boolean;
  inspectionRequired: boolean;
  tpiAgencyId: string | null;
  tpiAgency: TPIAgency | null;
  testingRequired: boolean;
  testType: string | null;
  inspectionLocation: string | null;
  qapDocumentPath: string | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  parameter: string;
  value: string;
  colourCodingRequired: boolean;
  inspectionRequired: boolean;
  tpiAgencyId: string;
  testingRequired: boolean;
  testType: string;
  inspectionLocation: string;
  qapDocumentPath: string;
  remarks: string;
}

const emptyForm: FormData = {
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
};

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QualityRequirementsPage() {
  const [requirements, setRequirements] = useState<QualityRequirement[]>([]);
  const [agencies, setAgencies] = useState<TPIAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QualityRequirement | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QualityRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quality/requirements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequirements(data.requirements || []);
    } catch {
      toast.error("Failed to fetch quality requirements");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgencies = useCallback(async () => {
    try {
      const res = await fetch("/api/masters/inspection-agencies");
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.agencies || []);
      }
    } catch {
      // Silently fail — agencies dropdown will be empty
    }
  }, []);

  useEffect(() => {
    fetchRequirements();
    fetchAgencies();
  }, [fetchRequirements, fetchAgencies]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: QualityRequirement) => {
    setEditingItem(item);
    setFormData({
      parameter: item.parameter,
      value: item.value || "",
      colourCodingRequired: item.colourCodingRequired,
      inspectionRequired: item.inspectionRequired,
      tpiAgencyId: item.tpiAgencyId || "",
      testingRequired: item.testingRequired,
      testType: item.testType || "",
      inspectionLocation: item.inspectionLocation || "",
      qapDocumentPath: item.qapDocumentPath || "",
      remarks: item.remarks || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
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

      if (editingItem) {
        const res = await fetch(`/api/quality/requirements/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update");
        }
        toast.success("Quality requirement updated");
      } else {
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
      }
      handleCloseDialog();
      fetchRequirements();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quality/requirements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Quality requirement deleted");
      setDeleteTarget(null);
      fetchRequirements();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<QualityRequirement>[] = [
    {
      key: "parameter",
      header: "Parameter",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-medium text-sm">{row.parameter}</span>
          {row.value && (
            <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
              {row.value}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "colourCodingRequired",
      header: "Colour Coding",
      cell: (row) => (
        <Badge variant={row.colourCodingRequired ? "default" : "secondary"} className="text-xs">
          {row.colourCodingRequired ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "inspectionRequired",
      header: "Inspection",
      cell: (row) => (
        <div className="space-y-0.5">
          <Badge variant={row.inspectionRequired ? "default" : "secondary"} className="text-xs">
            {row.inspectionRequired ? "Required" : "No"}
          </Badge>
          {row.inspectionRequired && row.inspectionLocation && (
            <div className="text-xs text-muted-foreground">
              {row.inspectionLocation === "WAREHOUSE" ? "Warehouse" : "Lab"}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "tpiAgency",
      header: "TPI Agency",
      cell: (row) =>
        row.tpiAgency ? (
          <span className="text-sm">{row.tpiAgency.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "testingRequired",
      header: "Testing",
      cell: (row) => (
        <div className="space-y-0.5">
          <Badge variant={row.testingRequired ? "default" : "secondary"} className="text-xs">
            {row.testingRequired ? "Required" : "No"}
          </Badge>
          {row.testingRequired && row.testType && (
            <div className="text-xs text-muted-foreground">
              {TEST_TYPES.find((t) => t.value === row.testType)?.label || row.testType}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "qapDocumentPath",
      header: "QAP Doc",
      cell: (row) =>
        row.qapDocumentPath ? (
          <a
            href={row.qapDocumentPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(row)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = requirements.filter((r) => r.isActive).length;
  const inspectionCount = requirements.filter((r) => r.inspectionRequired).length;
  const testingCount = requirements.filter((r) => r.testingRequired).length;
  const withDocsCount = requirements.filter((r) => r.qapDocumentPath).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Requirement Definitions"
        description="Define quality requirements as per QAP (Quality Assurance Plan)"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active Requirements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{inspectionCount}</div>
            <p className="text-xs text-muted-foreground">Inspection Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{testingCount}</div>
            <p className="text-xs text-muted-foreground">Testing Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{withDocsCount}</div>
            <p className="text-xs text-muted-foreground">With QAP Documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Quality Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              Loading requirements...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={requirements}
              searchKey="parameter"
              searchPlaceholder="Search by parameter, value, test type..."
              pageSize={25}
            />
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {editingItem ? "Edit" : "New"} Quality Requirement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Section 1: Parameter Definition */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Parameter Definition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Section 2: Requirement Flags */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Colour Coding */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="colourCoding" className="text-sm font-medium">
                        Colour Coding
                      </Label>
                      <p className="text-xs text-muted-foreground">Colour marking required</p>
                    </div>
                    <Switch
                      id="colourCoding"
                      checked={formData.colourCodingRequired}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, colourCodingRequired: checked }))
                      }
                    />
                  </div>

                  {/* Inspection Required */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="inspection" className="text-sm font-medium">
                        Inspection
                      </Label>
                      <p className="text-xs text-muted-foreground">Physical inspection needed</p>
                    </div>
                    <Switch
                      id="inspection"
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

                  {/* Testing Required */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="testing" className="text-sm font-medium">
                        Testing
                      </Label>
                      <p className="text-xs text-muted-foreground">Lab/field testing needed</p>
                    </div>
                    <Switch
                      id="testing"
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
                </div>
              </div>

              {/* Section 3: Inspection & Testing Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Inspection & Testing Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Inspection Location */}
                  <div className="grid gap-2">
                    <Label htmlFor="inspectionLocation">Inspection Location</Label>
                    <Select
                      value={formData.inspectionLocation}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, inspectionLocation: v }))
                      }
                      disabled={!formData.inspectionRequired}
                    >
                      <SelectTrigger id="inspectionLocation">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSPECTION_LOCATIONS.map((loc) => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* TPI Agency */}
                  <div className="grid gap-2">
                    <Label htmlFor="tpiAgency">TPI Agency</Label>
                    <Select
                      value={formData.tpiAgencyId}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, tpiAgencyId: v }))
                      }
                    >
                      <SelectTrigger id="tpiAgency">
                        <SelectValue placeholder="Select TPI agency" />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name} ({agency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {agencies.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No inspection agencies configured
                      </p>
                    )}
                  </div>

                  {/* Test Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="testType">Test Type</Label>
                    <Select
                      value={formData.testType}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, testType: v }))
                      }
                      disabled={!formData.testingRequired}
                    >
                      <SelectTrigger id="testType">
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 4: QAP Document & Remarks */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  QAP Document & Remarks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>QAP Document Upload</Label>
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
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, XLS, or image (max 10MB)
                    </p>
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
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingItem ? "Update Requirement" : "Create Requirement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quality Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the requirement for{" "}
              <strong>{deleteTarget?.parameter}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
