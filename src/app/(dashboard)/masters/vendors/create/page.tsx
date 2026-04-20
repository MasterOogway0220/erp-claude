"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface VendorFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  gstNo: string;
  gstType: string;
  panNo: string;
  productsSupplied: string;
  avgLeadTimeDays: string;
  vendorRating: string;
  bankName: string;
  bankBranchName: string;
  bankAccountNo: string;
  bankAccountType: string;
  bankIfsc: string;
  tanNo: string;
}

const defaultForm: VendorFormData = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  state: "",
  country: "India",
  gstNo: "",
  gstType: "",
  panNo: "",
  productsSupplied: "",
  avgLeadTimeDays: "",
  vendorRating: "",
  bankName: "",
  bankBranchName: "",
  bankAccountNo: "",
  bankAccountType: "",
  bankIfsc: "",
  tanNo: "",
};

export default function VendorCreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<VendorFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof VendorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson || null,
        email: formData.email || null,
        phone: formData.phone || null,
        addressLine1: formData.addressLine1 || null,
        addressLine2: formData.addressLine2 || null,
        city: formData.city || null,
        pincode: formData.pincode || null,
        state: formData.state || null,
        country: formData.country || "India",
        gstNo: formData.gstNo || null,
        gstType: formData.gstType || null,
        panNo: formData.panNo || null,
        productsSupplied: formData.productsSupplied || null,
        avgLeadTimeDays: formData.avgLeadTimeDays ? parseInt(formData.avgLeadTimeDays) : null,
        vendorRating: formData.vendorRating ? parseFloat(formData.vendorRating) : null,
        bankName: formData.bankName || null,
        bankBranchName: formData.bankBranchName || null,
        bankAccountNo: formData.bankAccountNo || null,
        bankAccountType: formData.bankAccountType || null,
        bankIfsc: formData.bankIfsc || null,
        tanNo: formData.tanNo || null,
      };

      const res = await fetch("/api/masters/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save vendor");
      }
      toast.success("Vendor created successfully");
      router.refresh();
      router.push("/masters/vendors");
    } catch (error: any) {
      toast.error(error.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Vendor" description="Create a new vendor / supplier record">
        <Button variant="outline" onClick={() => router.push("/masters/vendors")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Vendor"}
        </Button>
      </PageHeader>

      <div className="space-y-6 max-w-4xl">
        {/* Card 1: Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Vendor / supplier company name"
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => update("contactPerson", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Address & GST */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address &amp; GST</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => update("addressLine1", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => update("addressLine2", e.target.value)}
                placeholder="Area, landmark (optional)"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select
                  value={formData.state || "NONE"}
                  onValueChange={(v) => update("state", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select state</SelectItem>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gstNo">GST No</Label>
                <Input
                  id="gstNo"
                  value={formData.gstNo}
                  onChange={(e) => update("gstNo", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>GST Type</Label>
                <Select
                  value={formData.gstType || "NONE"}
                  onValueChange={(v) => update("gstType", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="COMPOSITION">Composition</SelectItem>
                    <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                    <SelectItem value="SEZ">SEZ</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="panNo">PAN No</Label>
                <Input
                  id="panNo"
                  value={formData.panNo}
                  onChange={(e) => update("panNo", e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Vendor Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="productsSupplied">Products Supplied</Label>
              <Textarea
                id="productsSupplied"
                value={formData.productsSupplied}
                onChange={(e) => update("productsSupplied", e.target.value)}
                placeholder="List the products or materials supplied by this vendor"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="avgLeadTimeDays">Avg Lead Time (Days)</Label>
                <Input
                  id="avgLeadTimeDays"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.avgLeadTimeDays}
                  onChange={(e) => update("avgLeadTimeDays", e.target.value)}
                  placeholder="e.g., 14"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendorRating">Vendor Rating (0–5)</Label>
                <Input
                  id="vendorRating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.vendorRating}
                  onChange={(e) => update("vendorRating", e.target.value)}
                  placeholder="e.g., 4.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  placeholder="e.g., State Bank of India"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankBranchName">Branch Name</Label>
                <Input
                  id="bankBranchName"
                  value={formData.bankBranchName}
                  onChange={(e) => update("bankBranchName", e.target.value)}
                  placeholder="Branch name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNo">Account Number</Label>
                <Input
                  id="bankAccountNo"
                  value={formData.bankAccountNo}
                  onChange={(e) => update("bankAccountNo", e.target.value)}
                  placeholder="Account number"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select
                  value={formData.bankAccountType || "NONE"}
                  onValueChange={(v) => update("bankAccountType", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CURRENT">Current</SelectItem>
                    <SelectItem value="CC">CC (Cash Credit)</SelectItem>
                    <SelectItem value="OD">OD (Overdraft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input
                  id="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={(e) => update("bankIfsc", e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tanNo">TAN No</Label>
                <Input
                  id="tanNo"
                  value={formData.tanNo}
                  onChange={(e) => update("tanNo", e.target.value.toUpperCase())}
                  placeholder="ABCD12345E"
                  maxLength={10}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push("/masters/vendors")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Vendor"}
          </Button>
        </div>
      </div>
    </div>
  );
}
