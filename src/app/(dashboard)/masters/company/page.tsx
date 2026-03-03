"use client";

import { useState, useEffect, useRef } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Save, Building2, MapPin, FileText, Pencil, Upload, X, Image } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface CompanyData {
  id?: string;
  companyName: string;
  companyType: string;
  regAddressLine1: string;
  regAddressLine2: string;
  regCity: string;
  regPincode: string;
  regState: string;
  regCountry: string;
  whAddressLine1: string;
  whAddressLine2: string;
  whCity: string;
  whPincode: string;
  whState: string;
  whCountry: string;
  panNo: string;
  tanNo: string;
  gstNo: string;
  cinNo: string;
  telephoneNo: string;
  email: string;
  website: string;
  companyLogoUrl: string;
  fyStartMonth: number;
  fyStartDate: string;
  fyEndDate: string;
}

const COMPANY_TYPES = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Limited",
  "Private Limited",
  "HUF",
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const defaultCompany: CompanyData = {
  companyName: "",
  companyType: "",
  regAddressLine1: "",
  regAddressLine2: "",
  regCity: "",
  regPincode: "",
  regState: "",
  regCountry: "India",
  whAddressLine1: "",
  whAddressLine2: "",
  whCity: "",
  whPincode: "",
  whState: "",
  whCountry: "India",
  panNo: "",
  tanNo: "",
  gstNo: "",
  cinNo: "",
  telephoneNo: "",
  email: "",
  website: "",
  companyLogoUrl: "",
  fyStartMonth: 4,
  fyStartDate: "",
  fyEndDate: "",
};

function toDateInput(val: string | null | undefined): string {
  if (!val) return "";
  return val.slice(0, 10);
}

export default function CompanyMasterPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyData>(defaultCompany);
  const [isExisting, setIsExisting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/masters/company");
      if (response.ok) {
        const data = await response.json();
        if (data.company) {
          setFormData({
            ...defaultCompany,
            ...data.company,
            companyType: data.company.companyType || "",
            regAddressLine1: data.company.regAddressLine1 || "",
            regAddressLine2: data.company.regAddressLine2 || "",
            regCity: data.company.regCity || "",
            regPincode: data.company.regPincode || "",
            regState: data.company.regState || "",
            regCountry: data.company.regCountry || "India",
            whAddressLine1: data.company.whAddressLine1 || "",
            whAddressLine2: data.company.whAddressLine2 || "",
            whCity: data.company.whCity || "",
            whPincode: data.company.whPincode || "",
            whState: data.company.whState || "",
            whCountry: data.company.whCountry || "India",
            panNo: data.company.panNo || "",
            tanNo: data.company.tanNo || "",
            gstNo: data.company.gstNo || "",
            cinNo: data.company.cinNo || "",
            telephoneNo: data.company.telephoneNo || "",
            email: data.company.email || "",
            website: data.company.website || "",
            companyLogoUrl: data.company.companyLogoUrl || "",
            fyStartMonth: data.company.fyStartMonth ?? 4,
            fyStartDate: toDateInput(data.company.fyStartDate),
            fyEndDate: toDateInput(data.company.fyEndDate),
          });
          setIsExisting(true);
          setEditMode(false);
        } else {
          // No company yet — go straight into edit mode for initial setup
          setEditMode(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch company:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CompanyData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2 MB");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      updateField("companyLogoUrl", data.filePath);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    updateField("companyLogoUrl", "");
  };

  const handleSave = async () => {
    if (!formData.companyName) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/masters/company", {
        method: isExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success("Company details saved successfully");
      setIsExisting(true);
      setEditMode(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    fetchCompany();
  };

  if (loading) {
    return <PageLoading />;
  }

  const disabled = !editMode;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Master"
        description="Manage your company details used in quotations, invoices and documents"
      >
        {editMode ? (
          <div className="flex gap-2">
            {isExisting && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditMode(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Enter company name"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Type</Label>
              <Select
                value={formData.companyType}
                onValueChange={(v) => updateField("companyType", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={formData.telephoneNo}
                  onChange={(e) => updateField("telephoneNo", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://..."
                disabled={disabled}
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              {formData.companyLogoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="border rounded-md p-2 bg-muted/30">
                    <img
                      src={formData.companyLogoUrl}
                      alt="Company Logo"
                      className="h-16 max-w-[200px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  {editMode && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : editMode ? (
                <div
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Click to upload logo (max 2 MB)"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No logo uploaded</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            <Separator />

            {/* Financial Year */}
            <div className="space-y-2">
              <Label>Financial Year Start Month</Label>
              <Select
                value={formData.fyStartMonth.toString()}
                onValueChange={(v) => updateField("fyStartMonth", parseInt(v))}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>FY Start Date</Label>
                <Input
                  type="date"
                  value={formData.fyStartDate}
                  onChange={(e) => updateField("fyStartDate", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>FY End Date</Label>
                <Input
                  type="date"
                  value={formData.fyEndDate}
                  onChange={(e) => updateField("fyEndDate", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Statutory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN No.</Label>
                <Input
                  value={formData.panNo}
                  onChange={(e) => updateField("panNo", e.target.value)}
                  placeholder="ABCDE1234F"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>TAN No.</Label>
                <Input
                  value={formData.tanNo}
                  onChange={(e) => updateField("tanNo", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GST No.</Label>
              <Input
                value={formData.gstNo}
                onChange={(e) => updateField("gstNo", e.target.value)}
                placeholder="15-character GST number"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>CIN No.</Label>
              <Input
                value={formData.cinNo}
                onChange={(e) => updateField("cinNo", e.target.value)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Registered Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                value={formData.regAddressLine1}
                onChange={(e) => updateField("regAddressLine1", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.regAddressLine2}
                onChange={(e) => updateField("regAddressLine2", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.regCity}
                  onChange={(e) => updateField("regCity", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.regPincode}
                  onChange={(e) => updateField("regPincode", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.regState}
                  onChange={(e) => updateField("regState", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.regCountry}
                  onChange={(e) => updateField("regCountry", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Warehouse Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                value={formData.whAddressLine1}
                onChange={(e) => updateField("whAddressLine1", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.whAddressLine2}
                onChange={(e) => updateField("whAddressLine2", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.whCity}
                  onChange={(e) => updateField("whCity", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.whPincode}
                  onChange={(e) => updateField("whPincode", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.whState}
                  onChange={(e) => updateField("whState", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.whCountry}
                  onChange={(e) => updateField("whCountry", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
