"use client";

import { useState, useCallback } from "react";
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
import { ArrowLeft, Save, Plus, Trash2, Loader2, MapPin } from "lucide-react";
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

interface AddressEntry {
  label: string;
  gstNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  fetchingPincode?: boolean;
}

const emptyAddress = (): AddressEntry => ({
  label: "", gstNo: "", addressLine1: "", addressLine2: "",
  city: "", pincode: "", state: "", country: "India",
});

interface WarehouseForm {
  code: string;
  name: string;
  stockVisible: boolean;
  isSelfStock: boolean;
}

export default function WarehouseCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<WarehouseForm>({
    code: "", name: "", stockVisible: true, isSelfStock: true,
  });
  const [addresses, setAddresses] = useState<AddressEntry[]>([emptyAddress()]);
  const [saving, setSaving] = useState(false);
  const [fetchingGstin, setFetchingGstin] = useState(false);

  const updateForm = <K extends keyof WarehouseForm>(field: K, value: WarehouseForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateAddress = (idx: number, field: keyof AddressEntry, value: string) =>
    setAddresses((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));

  const addAddress = () => setAddresses((prev) => [...prev, emptyAddress()]);

  const removeAddress = (idx: number) =>
    setAddresses((prev) => prev.filter((_, i) => i !== idx));

  const handlePincodeChange = useCallback(async (idx: number, value: string) => {
    updateAddress(idx, "pincode", value);
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setAddresses((prev) => prev.map((a, i) => i === idx ? { ...a, fetchingPincode: true } : a));
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0].PostOffice?.[0];
        if (post) {
          setAddresses((prev) => prev.map((a, i) => i === idx ? {
            ...a,
            city: a.city || post.District || "",
            state: a.state || post.State || "",
            country: "India",
            fetchingPincode: false,
          } : a));
        }
      }
    } catch { /* silent */ } finally {
      setAddresses((prev) => prev.map((a, i) => i === idx ? { ...a, fetchingPincode: false } : a));
    }
  }, []);

  const handleGstinChange = useCallback(async (value: string) => {
    updateAddress(0, "gstNo", value);
    if (value.length !== 15) return;
    setFetchingGstin(true);
    try {
      const res = await fetch(`/api/gst/search?gstin=${value}`);
      if (!res.ok) return;
      const data = await res.json();
      setAddresses((prev) => prev.map((a, i) => i === 0 ? {
        ...a,
        addressLine1: a.addressLine1 || data.regAddressLine1 || "",
        city: a.city || data.regCity || "",
        state: a.state || data.state || "",
        pincode: a.pincode || data.regPincode || "",
        country: data.country || "India",
      } : a));
      if (!form.name && data.companyName) updateForm("name", data.companyName);
    } catch { /* silent */ } finally {
      setFetchingGstin(false);
    }
  }, [form.name]);

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
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          stockVisible: form.stockVisible,
          isSelfStock: form.isSelfStock,
          addresses: addresses.filter((a) => a.addressLine1 || a.gstNo || a.city || a.pincode),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create warehouse");
      }
      toast.success("Warehouse created successfully");
      router.refresh();
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
        <Button variant="outline" className="mr-auto" onClick={() => router.push("/masters/warehouses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Warehouse"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        {/* Left col (2/3): Warehouse identity + addresses */}
        <div className="col-span-2 space-y-6">
          {/* Warehouse Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Warehouse Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                    placeholder="e.g., WH-NM"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g., Navi Mumbai Warehouse"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Locations / Addresses</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                  <Plus className="h-4 w-4 mr-1" />Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {addresses.map((addr, idx) => (
                <div key={idx} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {idx === 0 ? "Primary Location" : `Location ${idx + 1}`}
                    </div>
                    {idx > 0 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Location Label</Label>
                      <Input
                        value={addr.label}
                        onChange={(e) => updateAddress(idx, "label", e.target.value)}
                        placeholder="e.g., Main Gate, Loading Bay"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>GST No {idx === 0 && <span className="text-xs text-muted-foreground ml-1">(auto-fills address)</span>}</Label>
                      <div className="relative">
                        <Input
                          value={addr.gstNo}
                          onChange={(e) => idx === 0 ? handleGstinChange(e.target.value.toUpperCase()) : updateAddress(idx, "gstNo", e.target.value.toUpperCase())}
                          placeholder="27AABCN1234A1Z5"
                          maxLength={15}
                          className="font-mono pr-8"
                        />
                        {idx === 0 && fetchingGstin && (
                          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Address Line 1</Label>
                    <Input
                      value={addr.addressLine1}
                      onChange={(e) => updateAddress(idx, "addressLine1", e.target.value)}
                      placeholder="Street address, building"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address Line 2</Label>
                    <Input
                      value={addr.addressLine2}
                      onChange={(e) => updateAddress(idx, "addressLine2", e.target.value)}
                      placeholder="Area, landmark (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label>Pincode <span className="text-xs text-muted-foreground">(auto-fills)</span></Label>
                      <div className="relative">
                        <Input
                          value={addr.pincode}
                          onChange={(e) => handlePincodeChange(idx, e.target.value)}
                          placeholder="400001"
                          maxLength={6}
                          className="pr-8"
                        />
                        {addr.fetchingPincode && (
                          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input
                        value={addr.city}
                        onChange={(e) => updateAddress(idx, "city", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Select
                        value={addr.state || "NONE"}
                        onValueChange={(v) => updateAddress(idx, "state", v === "NONE" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Select state</SelectItem>
                          {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input
                        value={addr.country}
                        onChange={(e) => updateAddress(idx, "country", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right col (1/3): Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Stock Visible</Label>
                  <p className="text-xs text-muted-foreground">Show stock to all users</p>
                </div>
                <Switch checked={form.stockVisible} onCheckedChange={(v) => updateForm("stockVisible", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Self-owned Stock</Label>
                  <p className="text-xs text-muted-foreground">Company-owned vs third-party</p>
                </div>
                <Switch checked={form.isSelfStock} onCheckedChange={(v) => updateForm("isSelfStock", v)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push("/masters/warehouses")}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Warehouse"}
        </Button>
      </div>
    </div>
  );
}
