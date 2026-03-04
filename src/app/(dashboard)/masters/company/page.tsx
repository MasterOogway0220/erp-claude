"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Building2, MapPin, FileText, Pencil, Upload, X, Image, Plus, Trash2 } from "lucide-react";
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

function normalizeCompany(raw: any): CompanyData {
  return {
    ...defaultCompany,
    ...raw,
    companyType: raw.companyType || "",
    regAddressLine1: raw.regAddressLine1 || "",
    regAddressLine2: raw.regAddressLine2 || "",
    regCity: raw.regCity || "",
    regPincode: raw.regPincode || "",
    regState: raw.regState || "",
    regCountry: raw.regCountry || "India",
    whAddressLine1: raw.whAddressLine1 || "",
    whAddressLine2: raw.whAddressLine2 || "",
    whCity: raw.whCity || "",
    whPincode: raw.whPincode || "",
    whState: raw.whState || "",
    whCountry: raw.whCountry || "India",
    panNo: raw.panNo || "",
    tanNo: raw.tanNo || "",
    gstNo: raw.gstNo || "",
    cinNo: raw.cinNo || "",
    telephoneNo: raw.telephoneNo || "",
    email: raw.email || "",
    website: raw.website || "",
    companyLogoUrl: raw.companyLogoUrl || "",
    fyStartMonth: raw.fyStartMonth ?? 4,
    fyStartDate: toDateInput(raw.fyStartDate),
    fyEndDate: toDateInput(raw.fyEndDate),
  };
}

export default function CompanyMasterPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyData>(defaultCompany);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/masters/company");
      if (res.ok) {
        const data = await res.json();
        setCompanies((data.companies || []).map(normalizeCompany));
      }
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setFormData(defaultCompany);
    setSheetOpen(true);
  };

  const openEdit = (company: CompanyData) => {
    setFormData(company);
    setSheetOpen(true);
  };

  const updateField = (field: keyof CompanyData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be less than 2 MB"); return; }

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
    if (!formData.companyName) { toast.error("Company name is required"); return; }

    setSaving(true);
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/masters/company/${formData.id}` : "/api/masters/company";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(isEdit ? "Company updated" : "Company added");
      setSheetOpen(false);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/masters/company/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Company deleted");
      fetchCompanies();
    } catch {
      toast.error("Failed to delete company");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Master"
        description="Manage companies used in quotations, invoices and documents"
      >
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </PageHeader>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No companies added yet.</p>
            <Button variant="outline" className="mt-4" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add your first company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>GST No.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell>
                      {company.companyType ? (
                        <Badge variant="secondary">{company.companyType}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{company.regCity || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-sm">{company.gstNo || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{company.email || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(company)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(company.id!)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{formData.id ? "Edit Company" : "Add Company"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="w-4 h-4" /> Company Information
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Company Name *</Label>
                  <Input value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder="Enter company name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Type</Label>
                  <Select value={formData.companyType} onValueChange={(v) => updateField("companyType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telephone</Label>
                    <Input value={formData.telephoneNo} onChange={(e) => updateField("telephoneNo", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={formData.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
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
                    <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <Image className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload logo (max 2 MB)"}</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>

                <Separator />

                {/* Financial Year */}
                <div className="space-y-1.5">
                  <Label>Financial Year Start Month</Label>
                  <Select value={formData.fyStartMonth.toString()} onValueChange={(v) => updateField("fyStartMonth", parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>FY Start Date</Label>
                    <Input type="date" value={formData.fyStartDate} onChange={(e) => updateField("fyStartDate", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>FY End Date</Label>
                    <Input type="date" value={formData.fyEndDate} onChange={(e) => updateField("fyEndDate", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Statutory Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="w-4 h-4" /> Statutory Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>PAN No.</Label>
                  <Input value={formData.panNo} onChange={(e) => updateField("panNo", e.target.value)} placeholder="ABCDE1234F" />
                </div>
                <div className="space-y-1.5">
                  <Label>TAN No.</Label>
                  <Input value={formData.tanNo} onChange={(e) => updateField("tanNo", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>GST No.</Label>
                <Input value={formData.gstNo} onChange={(e) => updateField("gstNo", e.target.value)} placeholder="15-character GST number" />
              </div>
              <div className="space-y-1.5">
                <Label>CIN No.</Label>
                <Input value={formData.cinNo} onChange={(e) => updateField("cinNo", e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Registered Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4" /> Registered Address
              </div>
              <div className="space-y-3">
                <Input placeholder="Address Line 1" value={formData.regAddressLine1} onChange={(e) => updateField("regAddressLine1", e.target.value)} />
                <Input placeholder="Address Line 2" value={formData.regAddressLine2} onChange={(e) => updateField("regAddressLine2", e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City" value={formData.regCity} onChange={(e) => updateField("regCity", e.target.value)} />
                  <Input placeholder="Pincode" value={formData.regPincode} onChange={(e) => updateField("regPincode", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="State" value={formData.regState} onChange={(e) => updateField("regState", e.target.value)} />
                  <Input placeholder="Country" value={formData.regCountry} onChange={(e) => updateField("regCountry", e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Warehouse Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4" /> Warehouse Address
              </div>
              <div className="space-y-3">
                <Input placeholder="Address Line 1" value={formData.whAddressLine1} onChange={(e) => updateField("whAddressLine1", e.target.value)} />
                <Input placeholder="Address Line 2" value={formData.whAddressLine2} onChange={(e) => updateField("whAddressLine2", e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City" value={formData.whCity} onChange={(e) => updateField("whCity", e.target.value)} />
                  <Input placeholder="Pincode" value={formData.whPincode} onChange={(e) => updateField("whPincode", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="State" value={formData.whState} onChange={(e) => updateField("whState", e.target.value)} />
                  <Input placeholder="Country" value={formData.whCountry} onChange={(e) => updateField("whCountry", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex gap-2 pt-2 pb-6">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Company"}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
