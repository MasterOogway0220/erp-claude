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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, MapPin, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

interface DispatchAddress {
  label: string;
  consigneeName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  placeOfSupply: string;
  isDefault: boolean;
}

interface CustomerFormData {
  contactPerson: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  companyType: string;
  name: string;
  email: string;
  phone: string;
  companyReferenceCode: string;
  gstNo: string;
  gstType: string;
  panNo: string;
  tanNo: string;
  industrySegment: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  paymentTerms: string;
  defaultCurrency: string;
  currency: string;
  bankName: string;
  bankBranchName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankAccountType: string;
  dispatchAddresses: DispatchAddress[];
}

const emptyDispatchAddress: DispatchAddress = {
  label: "",
  consigneeName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  state: "",
  placeOfSupply: "",
  isDefault: false,
};

const defaultForm: CustomerFormData = {
  contactPerson: "",
  contactPersonEmail: "",
  contactPersonPhone: "",
  companyType: "BUYER",
  name: "",
  email: "",
  phone: "",
  companyReferenceCode: "",
  gstNo: "",
  gstType: "",
  panNo: "",
  tanNo: "",
  industrySegment: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  state: "",
  country: "India",
  openingBalance: "0",
  creditLimit: "",
  creditDays: "",
  paymentTerms: "100% within 30 Days",
  defaultCurrency: "INR",
  currency: "INR",
  bankName: "",
  bankBranchName: "",
  bankAccountNo: "",
  bankIfsc: "",
  bankAccountType: "",
  dispatchAddresses: [],
};

// Helper to fetch address from pincode
async function fetchAddressFromPincode(pincode: string): Promise<{ city: string; state: string; country: string } | null> {
  if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return { city: po.District || "", state: po.State || "", country: po.Country || "India" };
    }
    toast.error("Pincode not found");
    return null;
  } catch {
    toast.error("Failed to fetch address");
    return null;
  }
}

export default function CustomerCreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CustomerFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [fetchingDispatchPincode, setFetchingDispatchPincode] = useState<number | null>(null);

  const update = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePincodeChange = useCallback(async (value: string) => {
    update("pincode", value);
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setFetchingPincode(true);
    const result = await fetchAddressFromPincode(value);
    if (result) {
      setFormData((prev) => ({
        ...prev,
        city: result.city || prev.city,
        state: result.state || prev.state,
        country: result.country || "India",
      }));
    }
    setFetchingPincode(false);
  }, []);

  const handleGstinChange = useCallback(async (value: string) => {
    update("gstNo", value.toUpperCase());
    const gstin = value.toUpperCase();
    if (gstin.length !== 15) return;
    try {
      const res = await fetch(`/api/gst/search?gstin=${gstin}`);
      if (!res.ok) { toast.error("Invalid GSTIN"); return; }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        panNo: data.pan || prev.panNo,
        name: data.companyName && !prev.name ? data.companyName : prev.name,
        state: data.regState || data.state || prev.state,
        city: data.regCity && !prev.city ? data.regCity : prev.city,
        pincode: data.regPincode && !prev.pincode ? data.regPincode : prev.pincode,
        addressLine1: data.regAddressLine1 && !prev.addressLine1 ? data.regAddressLine1 : prev.addressLine1,
      }));
      toast.success(data.fromApi ? "Company details fetched from GSTIN" : "PAN and state auto-filled from GSTIN");
    } catch { toast.error("Failed to fetch GSTIN details"); }
  }, []);

  const addDispatchAddress = () => {
    update("dispatchAddresses", [
      ...formData.dispatchAddresses,
      { ...emptyDispatchAddress },
    ]);
  };

  const removeDispatchAddress = (index: number) => {
    update(
      "dispatchAddresses",
      formData.dispatchAddresses.filter((_, i) => i !== index)
    );
  };

  const updateDispatchAddress = (
    index: number,
    field: keyof DispatchAddress,
    value: any
  ) => {
    const updated = [...formData.dispatchAddresses];
    (updated[index] as any)[field] = value;
    update("dispatchAddresses", updated);
  };

  const handleDispatchPincodeChange = useCallback(async (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.dispatchAddresses];
      updated[index] = { ...updated[index], pincode: value };
      return { ...prev, dispatchAddresses: updated };
    });
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setFetchingDispatchPincode(index);
    const result = await fetchAddressFromPincode(value);
    if (result) {
      setFormData((prev) => {
        const updated = [...prev.dispatchAddresses];
        updated[index] = {
          ...updated[index],
          city: result.city || updated[index].city,
          state: result.state || updated[index].state,
        };
        return { ...prev, dispatchAddresses: updated };
      });
    }
    setFetchingDispatchPincode(null);
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/masters/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Customer created successfully");
      router.push("/masters/customers");
    } catch (error: any) {
      toast.error(error.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Customer"
        description="Create a new customer record"
      >
        <Button variant="outline" onClick={() => router.push("/masters/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Customer"}
        </Button>
      </PageHeader>

      {/* Row 1: Contact Person */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Contact Person</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={formData.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} placeholder="Contact person name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={formData.contactPersonEmail} onChange={(e) => update("contactPersonEmail", e.target.value)} placeholder="contact@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone No.</Label>
              <Input value={formData.contactPersonPhone} onChange={(e) => update("contactPersonPhone", e.target.value)} placeholder="+91 ..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Company Details + Statutory Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1.5">
                <Label>Company Type</Label>
                <Select value={formData.companyType} onValueChange={(v) => update("companyType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER">Buyer</SelectItem>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Company Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => update("email", e.target.value)} placeholder="company@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 22 23634200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Reference Code</Label>
                <Input value={formData.companyReferenceCode} onChange={(e) => update("companyReferenceCode", e.target.value)} placeholder="Internal reference" />
              </div>
              <div className="space-y-1.5">
                <Label>Industry Segment</Label>
                <Input value={formData.industrySegment} onChange={(e) => update("industrySegment", e.target.value)} placeholder="e.g., Oil & Gas" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Statutory Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GST Number</Label>
                <Input value={formData.gstNo} onChange={(e) => handleGstinChange(e.target.value)} placeholder="22AAAAA0000A1Z5" className="font-mono" maxLength={15} />
              </div>
              <div className="space-y-1.5">
                <Label>GST Type</Label>
                <Select value={formData.gstType || "NONE"} onValueChange={(v) => update("gstType", v === "NONE" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select GST type" /></SelectTrigger>
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
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>PAN Number</Label>
                <Input value={formData.panNo} onChange={(e) => update("panNo", e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>TAN Number</Label>
                <Input value={formData.tanNo} onChange={(e) => update("tanNo", e.target.value.toUpperCase())} placeholder="AAAA00000A" maxLength={10} className="font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Address + Financial Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Address Line 1</Label>
                <Input value={formData.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input value={formData.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} placeholder="Area, landmark" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <div className="relative">
                  <Input value={formData.pincode} onChange={(e) => handlePincodeChange(e.target.value)} placeholder="400004" maxLength={6} />
                  {fetchingPincode && <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />}
                </div>
              </div>
              <div className="space-y-1.5"><Label>City</Label><Input value={formData.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" /></div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={formData.state || "NONE"} onValueChange={(v) => update("state", v === "NONE" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select state</SelectItem>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={formData.country} onChange={(e) => update("country", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Opening Balance</Label>
                <Input type="number" step="0.01" value={formData.openingBalance} onChange={(e) => update("openingBalance", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Credit Limit (Rs.)</Label>
                <Input type="number" step="0.01" min="0" value={formData.creditLimit} onChange={(e) => update("creditLimit", e.target.value)} placeholder="No limit" />
              </div>
              <div className="space-y-1.5">
                <Label>Credit Days</Label>
                <Input type="number" step="1" min="0" value={formData.creditDays} onChange={(e) => update("creditDays", e.target.value)} placeholder="e.g., 30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <Input value={formData.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)} placeholder="e.g., 100% within 30 Days" />
              </div>
              <div className="space-y-1.5">
                <Label>Default Currency</Label>
                <Select value={formData.defaultCurrency} onValueChange={(v) => { update("defaultCurrency", v); update("currency", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Bank Details */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input value={formData.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="e.g., State Bank of India" />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Input value={formData.bankBranchName} onChange={(e) => update("bankBranchName", e.target.value)} placeholder="e.g., Fort, Mumbai" />
            </div>
            <div className="space-y-1.5">
              <Label>Account No.</Label>
              <Input value={formData.bankAccountNo} onChange={(e) => update("bankAccountNo", e.target.value)} placeholder="Account number" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code</Label>
              <Input value={formData.bankIfsc} onChange={(e) => update("bankIfsc", e.target.value.toUpperCase())} placeholder="SBIN0000001" maxLength={11} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={formData.bankAccountType || "NONE"} onValueChange={(v) => update("bankAccountType", v === "NONE" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Select</SelectItem>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                  <SelectItem value="OD">OD / CC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Addresses */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Dispatch Addresses</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDispatchAddress}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.dispatchAddresses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No dispatch addresses added yet.
              </p>
            )}
            {formData.dispatchAddresses.map((addr, i) => (
              <Card key={i} className="border border-border/60">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Dispatch Address {i + 1}
                      {addr.isDefault && (
                        <span className="text-xs font-normal text-primary ml-1">
                          (Default)
                        </span>
                      )}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeDispatchAddress(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={addr.label}
                        onChange={(e) => updateDispatchAddress(i, "label", e.target.value)}
                        placeholder="e.g., Site Office"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Consignee Name</Label>
                      <Input
                        value={addr.consigneeName}
                        onChange={(e) => updateDispatchAddress(i, "consigneeName", e.target.value)}
                        placeholder="Consignee name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address Line 1</Label>
                      <Input
                        value={addr.addressLine1}
                        onChange={(e) => updateDispatchAddress(i, "addressLine1", e.target.value)}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address Line 2</Label>
                      <Input
                        value={addr.addressLine2}
                        onChange={(e) => updateDispatchAddress(i, "addressLine2", e.target.value)}
                        placeholder="Area, landmark"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pincode</Label>
                      <div className="relative">
                        <Input
                          value={addr.pincode}
                          onChange={(e) => handleDispatchPincodeChange(i, e.target.value)}
                          placeholder="400004"
                          maxLength={6}
                        />
                        {fetchingDispatchPincode === i && <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <Input
                        value={addr.city}
                        onChange={(e) => updateDispatchAddress(i, "city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">State</Label>
                      <Select
                        value={addr.state || "NONE"}
                        onValueChange={(v) => updateDispatchAddress(i, "state", v === "NONE" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Select</SelectItem>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Place of Supply</Label>
                      <Select
                        value={addr.placeOfSupply || "NONE"}
                        onValueChange={(v) => updateDispatchAddress(i, "placeOfSupply", v === "NONE" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="PoS" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Select</SelectItem>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`isDefault-${i}`}
                          checked={addr.isDefault}
                          onChange={(e) => updateDispatchAddress(i, "isDefault", e.target.checked)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`isDefault-${i}`} className="text-xs cursor-pointer">
                          Default
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

      <Separator />

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push("/masters/customers")}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </div>
  );
}
