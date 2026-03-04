"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
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

interface WarehouseEditForm {
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
  isActive: boolean;
}

export default function WarehouseEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouseLabel, setWarehouseLabel] = useState("");
  const [form, setForm] = useState<WarehouseEditForm>({
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
    isActive: true,
  });

  useEffect(() => {
    const fetchWarehouse = async () => {
      try {
        const res = await fetch("/api/masters/warehouses");
        if (!res.ok) throw new Error("Failed to fetch warehouses");
        const data = await res.json();
        const wh = (data.warehouses as any[]).find((w: any) => w.id === id);

        if (!wh) {
          toast.error("Warehouse not found");
          router.push("/masters/warehouses");
          return;
        }

        setWarehouseLabel(`${wh.code} — ${wh.name}`);
        setForm({
          code: wh.code ?? "",
          name: wh.name ?? "",
          gstNo: wh.gstNo ?? "",
          addressLine1: wh.addressLine1 ?? "",
          addressLine2: wh.addressLine2 ?? "",
          pincode: wh.pincode ?? "",
          state: wh.state ?? "",
          country: wh.country ?? "India",
          stockVisible: wh.stockVisible ?? true,
          isSelfStock: wh.isSelfStock ?? true,
          isActive: wh.isActive ?? true,
        });
      } catch {
        toast.error("Failed to load warehouse");
        router.push("/masters/warehouses");
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouse();
  }, [id, router]);

  const update = <K extends keyof WarehouseEditForm>(
    field: K,
    value: WarehouseEditForm[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    setSaving(true);
    try {
      // Exclude code from PATCH payload — it cannot be changed
      const { code: _code, ...payload } = form;

      const res = await fetch(`/api/masters/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          gstNo: payload.gstNo || null,
          addressLine1: payload.addressLine1 || null,
          addressLine2: payload.addressLine2 || null,
          pincode: payload.pincode || null,
          state: payload.state || null,
          country: payload.country || "India",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update warehouse");
      }
      toast.success("Warehouse updated successfully");
      router.push("/masters/warehouses");
    } catch (error: any) {
      toast.error(error.message || "Failed to update warehouse");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Warehouse" description={warehouseLabel}>
        <Button variant="outline" onClick={() => router.push("/masters/warehouses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
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
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  disabled
                  className="bg-muted font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Warehouse code cannot be changed
                </p>
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
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this warehouse
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => update("isActive", v)}
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
