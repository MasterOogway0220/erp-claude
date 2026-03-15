"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Plus, Check, Building2, Phone, User, FileText } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchAddress {
  id: string;
  label: string | null;
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  pincode: string | null;
  state: string | null;
  country: string;
  contactPerson: string | null;
  contactNumber: string | null;
  gstNo: string | null;
  consigneeName: string | null;
  placeOfSupply: string | null;
  isDefault: boolean;
}

interface DispatchAddressSelectProps {
  customerId: string | null;
  value: string | null;                    // Selected address ID
  onChange: (addressId: string | null, address: DispatchAddress | null) => void;
  disabled?: boolean;
  showPreview?: boolean;                   // Show selected address details below
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface NewAddressForm {
  label: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactNumber: string;
  gstNo: string;
}

const emptyNewAddress: NewAddressForm = {
  label: "",
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  contactPerson: "",
  contactNumber: "",
  gstNo: "",
};

// ---------------------------------------------------------------------------
// Helper: format address for display
// ---------------------------------------------------------------------------

export function formatDispatchAddress(addr: DispatchAddress): string {
  const parts: string[] = [];
  if (addr.companyName) parts.push(addr.companyName);
  if (addr.addressLine1) parts.push(addr.addressLine1);
  if (addr.addressLine2) parts.push(addr.addressLine2);
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (addr.pincode) parts.push(`PIN: ${addr.pincode}`);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchAddressSelect({
  customerId,
  value,
  onChange,
  disabled = false,
  showPreview = true,
}: DispatchAddressSelectProps) {
  const [addresses, setAddresses] = useState<DispatchAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewAddressForm>(emptyNewAddress);
  const [saving, setSaving] = useState(false);

  const selectedAddress = addresses.find((a) => a.id === value) || null;

  const fetchAddresses = useCallback(async () => {
    if (!customerId) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/masters/customers/${customerId}/dispatch-addresses`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);

        // Auto-select default address if none selected
        if (!value) {
          const defaultAddr = (data.addresses || []).find((a: DispatchAddress) => a.isDefault);
          if (defaultAddr) {
            onChange(defaultAddr.id, defaultAddr);
          }
        }
      }
    } catch {
      // Silently fail — addresses are optional
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Pincode auto-fill
  const handlePincodeChange = useCallback(async (pincode: string) => {
    setNewForm((prev) => ({ ...prev, pincode }));
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setNewForm((prev) => ({
          ...prev,
          city: po.District || prev.city,
          state: po.State || prev.state,
        }));
      }
    } catch {
      // Ignore pincode lookup failures
    }
  }, []);

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    if (!newForm.addressLine1.trim() && !newForm.city.trim()) {
      toast.error("Please enter at least address or city");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/masters/customers/${customerId}/dispatch-addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          placeOfSupply: newForm.state,
          isDefault: addresses.length === 0, // First address is default
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save address");
      }

      const savedAddress = await res.json();
      toast.success("Dispatch address saved");

      // Refresh and select the new address
      await fetchAddresses();
      onChange(savedAddress.id, savedAddress);
      setIsNewDialogOpen(false);
      setNewForm(emptyNewAddress);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!customerId) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Dispatch / Delivery Address
        </Label>
        <div className="text-sm text-muted-foreground italic border rounded-md p-3">
          Select a customer first to choose dispatch address
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Dispatch / Delivery Address
      </Label>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={value || ""}
            onValueChange={(v) => {
              if (v === "__new__") {
                setIsNewDialogOpen(true);
                return;
              }
              const addr = addresses.find((a) => a.id === v) || null;
              onChange(v || null, addr);
            }}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading addresses..." : "Select dispatch address"} />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((addr) => (
                <SelectItem key={addr.id} value={addr.id}>
                  <div className="flex items-center gap-2">
                    {addr.isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Default
                      </Badge>
                    )}
                    <span>
                      {addr.label || addr.city || addr.addressLine1 || "Unnamed"}
                      {addr.city && addr.label ? ` — ${addr.city}` : ""}
                      {addr.state ? `, ${addr.state}` : ""}
                    </span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="__new__">
                <div className="flex items-center gap-2 text-primary">
                  <Plus className="h-3.5 w-3.5" />
                  Add New Dispatch Address
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setIsNewDialogOpen(true)}
          disabled={disabled}
          title="Add new address"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview of selected address */}
      {showPreview && selectedAddress && (
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3 px-4 space-y-1.5">
            {selectedAddress.companyName && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {selectedAddress.companyName}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {[
                selectedAddress.addressLine1,
                selectedAddress.addressLine2,
                [selectedAddress.city, selectedAddress.state].filter(Boolean).join(", "),
                selectedAddress.pincode ? `PIN: ${selectedAddress.pincode}` : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {selectedAddress.contactPerson && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {selectedAddress.contactPerson}
                </span>
              )}
              {selectedAddress.contactNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {selectedAddress.contactNumber}
                </span>
              )}
              {selectedAddress.gstNo && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> GST: {selectedAddress.gstNo}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Address Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSaveNew}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                New Dispatch / Site Address
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Label & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="da-label">Address Label</Label>
                  <Input
                    id="da-label"
                    value={newForm.label}
                    onChange={(e) => setNewForm({ ...newForm, label: e.target.value })}
                    placeholder='e.g., "Site Office - Mumbai", "Plant - Pune"'
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="da-company">Company Name (at site)</Label>
                  <Input
                    id="da-company"
                    value={newForm.companyName}
                    onChange={(e) => setNewForm({ ...newForm, companyName: e.target.value })}
                    placeholder="If different from billing company"
                  />
                </div>
              </div>

              {/* Address Lines */}
              <div className="grid gap-2">
                <Label htmlFor="da-addr1">Site Address Line 1</Label>
                <Input
                  id="da-addr1"
                  value={newForm.addressLine1}
                  onChange={(e) => setNewForm({ ...newForm, addressLine1: e.target.value })}
                  placeholder="Street address, building, floor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="da-addr2">Site Address Line 2</Label>
                <Input
                  id="da-addr2"
                  value={newForm.addressLine2}
                  onChange={(e) => setNewForm({ ...newForm, addressLine2: e.target.value })}
                  placeholder="Area, landmark (optional)"
                />
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="da-city">City</Label>
                  <Input
                    id="da-city"
                    value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="da-state">State</Label>
                  <Select
                    value={newForm.state}
                    onValueChange={(v) => setNewForm({ ...newForm, state: v })}
                  >
                    <SelectTrigger id="da-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="da-pin">PIN Code</Label>
                  <Input
                    id="da-pin"
                    value={newForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="6-digit PIN"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Auto-fills city & state</p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="da-contact">Contact Person</Label>
                  <Input
                    id="da-contact"
                    value={newForm.contactPerson}
                    onChange={(e) => setNewForm({ ...newForm, contactPerson: e.target.value })}
                    placeholder="Site contact name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="da-phone">Contact Number</Label>
                  <Input
                    id="da-phone"
                    value={newForm.contactNumber}
                    onChange={(e) => setNewForm({ ...newForm, contactNumber: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              {/* GST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="da-gst">GST No. (if different from billing)</Label>
                  <Input
                    id="da-gst"
                    value={newForm.gstNo}
                    onChange={(e) => setNewForm({ ...newForm, gstNo: e.target.value.toUpperCase() })}
                    placeholder="e.g., 27AAAAA0000A1Z5"
                    maxLength={15}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Important for site deliveries where GST jurisdiction differs from billing
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewDialogOpen(false);
                  setNewForm(emptyNewAddress);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Check className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save & Select Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
