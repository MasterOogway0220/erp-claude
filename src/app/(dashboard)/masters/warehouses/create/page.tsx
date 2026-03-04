"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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

interface WarehouseForm {
  code: string;
  name: string;
  gstNo: string;
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  state: string;
  country: string;
  stockVisible: boolean;
  isSelfStock: boolean;
}

const defaultForm: WarehouseForm = {
  code: "",
  name: "",
  gstNo: "",
  addressLine1: "",
  addressLine2: "",
  pincode: "",
  state: "",
  country: "India",
  stockVisible: true,
  isSelfStock: true,
};

export default function WarehouseCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<WarehouseForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof WarehouseForm>(field: K, value: WarehouseForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Warehouse code and name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/masters/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          gstNo: form.gstNo || null,
          addressLine1: form.addressLine1 || null,
          addressLine2: form.addressLine2 || null,
          pincode: form.pincode || null,
          state: form.state || null,
          country: form.country || "India",
          stockVisible: form.stockVisible,
          isSelfStock: form.isSelfStock,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create warehouse");
      }
      toast.success("Warehouse created successfully");
      router.push("/masters/warehouses");
    } catch (error: any) {
      toast.error(error.message || "Failed to create warehouse");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Warehouse" description="Create a new warehouse record">
        <Button variant="outline" onClick={() => router.push("/masters/warehouses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Warehouse"}
        </Button>
      </PageHeader>

      <div className="space-y-6 max-w-3xl">
        {/* Card 1: Warehouse Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => update("code", e.target.value.toUpperCase())}
                  placeholder="e.g., WH-NM"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g., Navi Mumbai Warehouse"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNo">GST No</Label>
              <Input
                id="gstNo"
                value={form.gstNo}
                onChange={(e) => update("gstNo", e.target.value.toUpperCase())}
                placeholder="e.g., 27AABCN1234A1Z5"
                maxLength={15}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => update("addressLine1", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={form.addressLine2}
                onChange={(e) => update("addressLine2", e.target.value)}
                placeholder="Area, landmark (optional)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select
                  value={form.state || "NONE"}
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
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Stock Visible to all users</Label>
                <p className="text-xs text-muted-foreground">
                  Show stock from this warehouse to all users in listings
                </p>
              </div>
              <Switch
                checked={form.stockVisible}
                onCheckedChange={(v) => update("stockVisible", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Self-owned Stock</Label>
                <p className="text-xs text-muted-foreground">
                  This is company-owned stock vs third-party storage
                </p>
              </div>
              <Switch
                checked={form.isSelfStock}
                onCheckedChange={(v) => update("isSelfStock", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push("/masters/warehouses")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Warehouse"}
          </Button>
        </div>
      </div>
    </div>
  );
}
