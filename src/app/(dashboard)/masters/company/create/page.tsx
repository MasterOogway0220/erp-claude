"use client";

import { useState, useRef, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  Building2,
  MapPin,
  FileText,
  Calendar,
  Upload,
  X,
  Image,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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

interface CompanyFormData {
  companyName: string;
  companyType: string;
  email: string;
  telephoneNo: string;
  website: string;
  companyLogoUrl: string;
  fyStartMonth: number;
  fyStartDate: string;
  fyEndDate: string;
  panNo: string;
  tanNo: string;
  gstNo: string;
  cinNo: string;
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
}

const defaultForm: CompanyFormData = {
  companyName: "",
  companyType: "",
  email: "",
  telephoneNo: "",
  website: "",
  companyLogoUrl: "",
  fyStartMonth: 4,
  fyStartDate: "",
  fyEndDate: "",
  panNo: "",
  tanNo: "",
  gstNo: "",
  cinNo: "",
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
};

export default function CompanyCreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CompanyFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState<"reg" | "wh" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof CompanyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGstinChange = useCallback(async (value: string) => {
    updateField("gstNo", value.toUpperCase());
    const gstin = value.toUpperCase();
    if (gstin.length !== 15) return;
    try {
      const res = await fetch(`/api/gst/search?gstin=${gstin}`);
      if (!res.ok) { toast.error("Invalid GSTIN"); return; }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        panNo: data.pan || prev.panNo,
        companyType: data.companyType && !prev.companyType ? data.companyType : prev.companyType,
        companyName: data.companyName && !prev.companyName ? data.companyName : prev.companyName,
        regAddressLine1: data.regAddressLine1 && !prev.regAddressLine1 ? data.regAddressLine1 : prev.regAddressLine1,
        regCity: data.regCity && !prev.regCity ? data.regCity : prev.regCity,
        regState: data.regState || data.state || prev.regState,
        regPincode: data.regPincode && !prev.regPincode ? data.regPincode : prev.regPincode,
        regCountry: data.country || prev.regCountry,
      }));
      toast.success(data.fromApi ? "Company details fetched from GSTIN" : "PAN and state auto-filled from GSTIN");
    } catch {
      toast.error("Failed to fetch GSTIN details");
    }
  }, []);

  const handlePincodeChange = useCallback(async (prefix: "reg" | "wh", value: string) => {
    updateField(`${prefix}Pincode` as keyof CompanyFormData, value);
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setFetchingPincode(prefix);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setFormData((prev) => ({
          ...prev,
          [`${prefix}City`]: po.District || prev[`${prefix}City` as keyof CompanyFormData],
          [`${prefix}State`]: po.State || prev[`${prefix}State` as keyof CompanyFormData],
          [`${prefix}Country`]: po.Country || "India",
        }));
      } else {
        toast.error("Pincode not found");
      }
    } catch {
      toast.error("Failed to fetch address");
    } finally {
      setFetchingPincode(null);
    }
  }, []);

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

  const handleSave = async () => {
    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/masters/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Company created successfully");
      router.push("/masters/company");
    } catch (error: any) {
      toast.error(error.message || "Failed to create company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Company"
        description="Create a new company record"
      >
        <Button variant="outline" onClick={() => router.push("/masters/company")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Company"}
        </Button>
      </PageHeader>

      {/* Row 1: Company Info (full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Type</Label>
              <Select
                value={formData.companyType || "NONE"}
                onValueChange={(v) => updateField("companyType", v === "NONE" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Select type</SelectItem>
                  {COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="company@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telephone</Label>
              <Input value={formData.telephoneNo} onChange={(e) => updateField("telephoneNo", e.target.value)} placeholder="+91 ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={formData.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          {/* Logo */}
          <div className="space-y-1.5">
            <Label>Company Logo</Label>
            {formData.companyLogoUrl ? (
              <div className="flex items-center gap-4">
                <div className="border rounded-md p-2 bg-muted/30">
                  <img src={formData.companyLogoUrl} alt="Logo" className="h-12 max-w-[160px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-1" /> Change
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => updateField("companyLogoUrl", "")}>
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors max-w-xs" onClick={() => fileInputRef.current?.click()}>
                <Image className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload logo (max 2 MB)"}</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Statutory + Financial Year side by side */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Statutory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>PAN No.</Label>
                <Input value={formData.panNo} onChange={(e) => updateField("panNo", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>TAN No.</Label>
                <Input value={formData.tanNo} onChange={(e) => updateField("tanNo", e.target.value.toUpperCase())} className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>GST No.</Label>
                <Input value={formData.gstNo} onChange={(e) => handleGstinChange(e.target.value)} placeholder="15-char GST" className="font-mono" maxLength={15} />
              </div>
              <div className="space-y-1.5">
                <Label>CIN No.</Label>
                <Input value={formData.cinNo} onChange={(e) => updateField("cinNo", e.target.value.toUpperCase())} className="font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              Financial Year
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>FY Start Month</Label>
              <Select value={formData.fyStartMonth.toString()} onValueChange={(v) => updateField("fyStartMonth", parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>FY Start Date</Label>
                <Input type="date" value={formData.fyStartDate} onChange={(e) => updateField("fyStartDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>FY End Date</Label>
                <Input type="date" value={formData.fyEndDate} onChange={(e) => updateField("fyEndDate", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Registered Address + Warehouse Address side by side */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Registered Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Address Line 1</Label>
              <Input value={formData.regAddressLine1} onChange={(e) => updateField("regAddressLine1", e.target.value)} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label>Address Line 2</Label>
              <Input value={formData.regAddressLine2} onChange={(e) => updateField("regAddressLine2", e.target.value)} placeholder="Area, landmark" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>City</Label><Input value={formData.regCity} onChange={(e) => updateField("regCity", e.target.value)} placeholder="Mumbai" /></div>
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <div className="relative">
                  <Input value={formData.regPincode} onChange={(e) => handlePincodeChange("reg", e.target.value)} placeholder="400001" maxLength={6} />
                  {fetchingPincode === "reg" && <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>State</Label><Input value={formData.regState} onChange={(e) => updateField("regState", e.target.value)} placeholder="Maharashtra" /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={formData.regCountry} onChange={(e) => updateField("regCountry", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Warehouse Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Address Line 1</Label>
              <Input value={formData.whAddressLine1} onChange={(e) => updateField("whAddressLine1", e.target.value)} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label>Address Line 2</Label>
              <Input value={formData.whAddressLine2} onChange={(e) => updateField("whAddressLine2", e.target.value)} placeholder="Area, landmark" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>City</Label><Input value={formData.whCity} onChange={(e) => updateField("whCity", e.target.value)} placeholder="Mumbai" /></div>
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <div className="relative">
                  <Input value={formData.whPincode} onChange={(e) => handlePincodeChange("wh", e.target.value)} placeholder="400001" maxLength={6} />
                  {fetchingPincode === "wh" && <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>State</Label><Input value={formData.whState} onChange={(e) => updateField("whState", e.target.value)} placeholder="Maharashtra" /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={formData.whCountry} onChange={(e) => updateField("whCountry", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push("/masters/company")}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Company"}
        </Button>
      </div>
    </div>
  );
}
