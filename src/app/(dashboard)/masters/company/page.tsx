"use client";

import { useState, useEffect } from "react";
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
import { Save, Building2, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

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
};

export default function CompanyMasterPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyData>(defaultCompany);
  const [isExisting, setIsExisting] = useState(false);

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
          });
          setIsExisting(true);
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Master"
        description="Manage your company details used in quotations, invoices and documents"
      >
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Company Type</Label>
              <Select
                value={formData.companyType}
                onValueChange={(v) => updateField("companyType", v)}
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
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={formData.telephoneNo}
                  onChange={(e) => updateField("telephoneNo", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Company Logo URL</Label>
              <Input
                value={formData.companyLogoUrl}
                onChange={(e) => updateField("companyLogoUrl", e.target.value)}
                placeholder="URL to company logo"
              />
            </div>
            <div className="space-y-2">
              <Label>Financial Year Start Month</Label>
              <Select
                value={formData.fyStartMonth.toString()}
                onValueChange={(v) => updateField("fyStartMonth", parseInt(v))}
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
                />
              </div>
              <div className="space-y-2">
                <Label>TAN No.</Label>
                <Input
                  value={formData.tanNo}
                  onChange={(e) => updateField("tanNo", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GST No.</Label>
              <Input
                value={formData.gstNo}
                onChange={(e) => updateField("gstNo", e.target.value)}
                placeholder="15-character GST number"
              />
            </div>
            <div className="space-y-2">
              <Label>CIN No.</Label>
              <Input
                value={formData.cinNo}
                onChange={(e) => updateField("cinNo", e.target.value)}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.regAddressLine2}
                onChange={(e) => updateField("regAddressLine2", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.regCity}
                  onChange={(e) => updateField("regCity", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.regPincode}
                  onChange={(e) => updateField("regPincode", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.regState}
                  onChange={(e) => updateField("regState", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.regCountry}
                  onChange={(e) => updateField("regCountry", e.target.value)}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.whAddressLine2}
                onChange={(e) => updateField("whAddressLine2", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.whCity}
                  onChange={(e) => updateField("whCity", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.whPincode}
                  onChange={(e) => updateField("whPincode", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.whState}
                  onChange={(e) => updateField("whState", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.whCountry}
                  onChange={(e) => updateField("whCountry", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
