"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, MapPin, Plus, X, Loader2, ListChecks, Users } from "lucide-react";
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

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Cambodia", "Cameroon", "Canada", "Chile", "China",
  "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Hong Kong",
  "Hungary", "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait",
  "Kyrgyzstan", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
  "Macau", "Malaysia", "Maldives", "Malta", "Mauritius", "Mexico", "Moldova",
  "Mongolia", "Montenegro", "Morocco", "Myanmar", "Nepal", "Netherlands",
  "New Zealand", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Senegal",
  "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea",
  "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Turkmenistan",
  "UAE", "Uganda", "Ukraine", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

interface DispatchAddress {
  id?: string;
  label: string;
  companyName: string;
  consigneeName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  contactPerson: string;
  contactNumber: string;
  gstNo: string;
  placeOfSupply: string;
  isDefault: boolean;
}

interface CustomerFormData {
  customerType: string;
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
  isActive: boolean;
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
  companyName: "",
  consigneeName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  state: "",
  contactPerson: "",
  contactNumber: "",
  gstNo: "",
  placeOfSupply: "",
  isDefault: false,
};

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

export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CustomerFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [fetchingDispatchPincode, setFetchingDispatchPincode] = useState<number | null>(null);
  const [termsQuotationType, setTermsQuotationType] = useState("DOMESTIC");
  const [terms, setTerms] = useState<{ termName: string; termValue: string; isIncluded: boolean; isCustom: boolean }[]>([]);
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/masters/customers/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Customer not found");
            router.push("/masters/customers");
            return;
          }
          throw new Error("Failed to fetch customer");
        }
        const customer = await res.json();
        setFormData({
          customerType: customer.customerType || "DOMESTIC",
          companyType: customer.companyType || "BUYER",
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          companyReferenceCode: customer.companyReferenceCode || "",
          gstNo: customer.gstNo || "",
          gstType: customer.gstType || "",
          panNo: customer.panNo || customer.pan || "",
          tanNo: customer.tanNo || "",
          industrySegment: customer.industrySegment || "",
          isActive: customer.isActive ?? true,
          addressLine1: customer.addressLine1 || "",
          addressLine2: customer.addressLine2 || "",
          city: customer.city || "",
          pincode: customer.pincode || "",
          state: customer.state || "",
          country: customer.country || "India",
          openingBalance: customer.openingBalance?.toString() || "0",
          creditLimit: customer.creditLimit?.toString() || "",
          creditDays: customer.creditDays?.toString() || "",
          paymentTerms: customer.paymentTerms || "100% within 30 Days",
          defaultCurrency: customer.defaultCurrency || "INR",
          currency: customer.currency || "INR",
          bankName: customer.bankName || "",
          bankBranchName: customer.bankBranchName || "",
          bankAccountNo: customer.bankAccountNo || "",
          bankIfsc: customer.bankIfsc || "",
          bankAccountType: customer.bankAccountType || "",
          dispatchAddresses:
            customer.dispatchAddresses?.map((a: any) => ({
              id: a.id,
              label: a.label || "",
              companyName: a.companyName || "",
              consigneeName: a.consigneeName || "",
              addressLine1: a.addressLine1 || "",
              addressLine2: a.addressLine2 || "",
              city: a.city || "",
              pincode: a.pincode || "",
              state: a.state || "",
              contactPerson: a.contactPerson || "",
              contactNumber: a.contactNumber || "",
              gstNo: a.gstNo || "",
              placeOfSupply: a.placeOfSupply || "",
              isDefault: a.isDefault || false,
            })) || [],
        });
      } catch {
        toast.error("Failed to load customer");
        router.push("/masters/customers");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id, router]);

  const [industrySegments, setIndustrySegments] = useState<string[]>([]);
  useEffect(() => {
    if (!formData) return;
    const cat = formData.companyType === "SUPPLIER" ? "VENDOR" : "CUSTOMER";
    fetch(`/api/masters/industry-segments?category=${cat}`)
      .then(r => r.ok ? r.json() : { segments: [] })
      .then(d => setIndustrySegments((d.segments || []).map((s: any) => s.name)))
      .catch(() => {});
  }, [formData?.companyType]);

  // Load customer-specific terms or fall back to global templates
  useEffect(() => {
    if (!id) return;
    const loadTerms = async () => {
      try {
        // First try customer-specific terms
        const custRes = await fetch(`/api/masters/customers/${id}/terms?quotationType=${termsQuotationType}`);
        const custData = await custRes.json();

        if (custData.terms?.length > 0) {
          setTerms(custData.terms.map((t: any) => ({
            termName: t.termName,
            termValue: t.termValue || "",
            isIncluded: t.isIncluded ?? true,
            isCustom: false,
          })));
        } else {
          // Fall back to global offer term templates
          const tplRes = await fetch(`/api/offer-term-templates?quotationType=${termsQuotationType}`);
          const tplData = await tplRes.json();
          setTerms((tplData.templates || []).map((t: any) => ({
            termName: t.termName,
            termValue: t.termDefaultValue || "",
            isIncluded: true,
            isCustom: false,
          })));
        }
        setTermsLoaded(true);
      } catch {
        console.error("Failed to load terms");
      }
    };
    loadTerms();
  }, [id, termsQuotationType]);

  const saveTerms = async () => {
    setSavingTerms(true);
    try {
      const res = await fetch(`/api/masters/customers/${id}/terms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationType: termsQuotationType, terms }),
      });
      if (!res.ok) throw new Error("Failed to save terms");
      toast.success(`${termsQuotationType} terms saved for this customer`);
    } catch {
      toast.error("Failed to save terms");
    } finally {
      setSavingTerms(false);
    }
  };

  const resetTermsToGlobal = async () => {
    try {
      const tplRes = await fetch(`/api/offer-term-templates?quotationType=${termsQuotationType}`);
      const tplData = await tplRes.json();
      setTerms((tplData.templates || []).map((t: any) => ({
        termName: t.termName,
        termValue: t.termDefaultValue || "",
        isIncluded: true,
        isCustom: false,
      })));
      toast.success("Terms reset to global defaults");
    } catch {
      toast.error("Failed to reset terms");
    }
  };

  const update = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handlePincodeChange = useCallback(async (value: string) => {
    setFormData((prev) => prev ? { ...prev, pincode: value } : prev);
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setFetchingPincode(true);
    const result = await fetchAddressFromPincode(value);
    if (result) {
      setFormData((prev) => prev ? ({ ...prev, city: result.city || prev.city, state: result.state || prev.state, country: result.country || "India" }) : prev);
    }
    setFetchingPincode(false);
  }, []);

  const handleGstinChange = useCallback(async (value: string) => {
    setFormData((prev) => prev ? { ...prev, gstNo: value.toUpperCase() } : prev);
    const gstin = value.toUpperCase();
    if (gstin.length !== 15) return;
    try {
      const res = await fetch(`/api/gst/search?gstin=${gstin}`);
      if (!res.ok) { toast.error("Invalid GSTIN"); return; }
      const data = await res.json();
      setFormData((prev) => prev ? ({
        ...prev,
        panNo: data.pan || prev.panNo,
        name: data.companyName && !prev.name ? data.companyName : prev.name,
        state: data.regState || data.state || prev.state,
        city: data.regCity && !prev.city ? data.regCity : prev.city,
        pincode: data.regPincode && !prev.pincode ? data.regPincode : prev.pincode,
        addressLine1: data.regAddressLine1 && !prev.addressLine1 ? data.regAddressLine1 : prev.addressLine1,
      }) : prev);
      toast.success(data.fromApi ? "Company details fetched from GSTIN" : "PAN and state auto-filled from GSTIN");
    } catch { toast.error("Failed to fetch GSTIN details"); }
  }, []);

  const addDispatchAddress = () => {
    if (!formData) return;
    update("dispatchAddresses", [
      ...formData.dispatchAddresses,
      { ...emptyDispatchAddress },
    ]);
  };

  const removeDispatchAddress = (index: number) => {
    if (!formData) return;
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
    if (!formData) return;
    const updated = [...formData.dispatchAddresses];
    (updated[index] as any)[field] = value;
    update("dispatchAddresses", updated);
  };

  const handleDispatchPincodeChange = useCallback(async (index: number, value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = [...prev.dispatchAddresses];
      updated[index] = { ...updated[index], pincode: value };
      return { ...prev, dispatchAddresses: updated };
    });
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return;
    setFetchingDispatchPincode(index);
    const result = await fetchAddressFromPincode(value);
    if (result) {
      setFormData((prev) => {
        if (!prev) return prev;
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
    if (!formData) return;
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/masters/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Customer updated successfully");
      router.push("/masters/customers");
    } catch (error: any) {
      toast.error(error.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!formData) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Customer"
        description="Update customer information"
      >
        <Button variant="outline" onClick={() => router.push("/masters/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={() => router.push(`/masters/customer-contacts?customerId=${id}`)}>
          <Users className="w-4 h-4 mr-2" />
          Manage Contacts
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      {/* Row 1: Company Details + Statutory Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1.5">
                <Label>Customer Type</Label>
                <Select value={formData.customerType} onValueChange={(v) => {
                  if (v === "DOMESTIC") {
                    setFormData((prev) => prev ? { ...prev, customerType: v, country: "India", state: "", pincode: "", defaultCurrency: "INR", currency: "INR" } : prev);
                  } else {
                    setFormData((prev) => prev ? { ...prev, customerType: v, country: "", state: "", pincode: "", defaultCurrency: "USD", currency: "USD" } : prev);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOMESTIC">Domestic</SelectItem>
                    <SelectItem value="INTERNATIONAL">International</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Reference Code</Label>
                <Input value={formData.companyReferenceCode} onChange={(e) => update("companyReferenceCode", e.target.value)} placeholder="Internal reference" />
              </div>
              <div className="space-y-1.5">
                <Label>Industry Segment</Label>
                <Select value={formData.industrySegment || "NONE"} onValueChange={(v) => update("industrySegment", v === "NONE" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">-- Select --</SelectItem>
                    {industrySegments.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={(v) => update("isActive", v === "ACTIVE")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
            {formData.customerType === "DOMESTIC" ? (
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
                <div className="space-y-1.5"><Label>Country</Label><Input value="India" disabled /></div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select value={formData.country || "NONE"} onValueChange={(v) => update("country", v === "NONE" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Select country</SelectItem>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>City</Label><Input value={formData.city} onChange={(e) => update("city", e.target.value)} placeholder="City" /></div>
                <div className="space-y-1.5">
                  <Label>State / Province</Label>
                  <Input value={formData.state} onChange={(e) => update("state", e.target.value)} placeholder="State or province" />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP / Postal Code</Label>
                  <Input value={formData.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="Postal code" />
                </div>
              </div>
            )}
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

      {/* Terms & Conditions Configuration */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Default Terms & Conditions
            </span>
            <div className="flex items-center gap-2">
              <Select value={termsQuotationType} onValueChange={setTermsQuotationType}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestic</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={resetTermsToGlobal}>
                Reset to Global
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setTerms([...terms, { termName: "", termValue: "", isIncluded: true, isCustom: true }])}>
                <Plus className="w-4 h-4 mr-1" />
                Add Term
              </Button>
              <Button type="button" size="sm" onClick={saveTerms} disabled={savingTerms}>
                <Save className="w-4 h-4 mr-1" />
                {savingTerms ? "Saving..." : "Save Terms"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            Configure default T&C for this customer. These will auto-populate when creating quotations for this customer.
          </p>
          {terms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No terms configured. Using global defaults.
            </p>
          )}
          <div className="space-y-2">
            {terms.map((term, i) => (
              <div key={i} className="flex items-center gap-3">
                <Checkbox
                  checked={term.isIncluded}
                  onCheckedChange={(checked) => {
                    const newTerms = [...terms];
                    newTerms[i] = { ...newTerms[i], isIncluded: !!checked };
                    setTerms(newTerms);
                  }}
                />
                <Input
                  value={term.termName}
                  onChange={(e) => {
                    const newTerms = [...terms];
                    newTerms[i] = { ...newTerms[i], termName: e.target.value };
                    setTerms(newTerms);
                  }}
                  placeholder="Term name"
                  className="w-[220px]"
                  disabled={!term.isCustom}
                />
                <Input
                  value={term.termValue}
                  onChange={(e) => {
                    const newTerms = [...terms];
                    newTerms[i] = { ...newTerms[i], termValue: e.target.value };
                    setTerms(newTerms);
                  }}
                  placeholder="Term value"
                  className="flex-1"
                />
                {term.isCustom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTerms(terms.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
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
                  {/* Row 1: Label, Company Name, Consignee */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={addr.label}
                        onChange={(e) => updateDispatchAddress(i, "label", e.target.value)}
                        placeholder="e.g., Site Office - Mumbai"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Company Name (at site)</Label>
                      <Input
                        value={addr.companyName}
                        onChange={(e) => updateDispatchAddress(i, "companyName", e.target.value)}
                        placeholder="If different from billing"
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
                  </div>
                  {/* Row 2: Address Lines */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Site Address Line 1</Label>
                      <Input
                        value={addr.addressLine1}
                        onChange={(e) => updateDispatchAddress(i, "addressLine1", e.target.value)}
                        placeholder="Street address, building"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Site Address Line 2</Label>
                      <Input
                        value={addr.addressLine2}
                        onChange={(e) => updateDispatchAddress(i, "addressLine2", e.target.value)}
                        placeholder="Area, landmark"
                      />
                    </div>
                  </div>
                  {/* Row 3: City, State, PIN, PoS */}
                  <div className="grid grid-cols-4 gap-3">
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
                      <Label className="text-xs">PIN Code</Label>
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
                  </div>
                  {/* Row 4: Contact, Phone, GST, Default */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contact Person</Label>
                      <Input
                        value={addr.contactPerson}
                        onChange={(e) => updateDispatchAddress(i, "contactPerson", e.target.value)}
                        placeholder="Site contact name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contact Number</Label>
                      <Input
                        value={addr.contactNumber}
                        onChange={(e) => updateDispatchAddress(i, "contactNumber", e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">GST No. (if different)</Label>
                      <Input
                        value={addr.gstNo}
                        onChange={(e) => updateDispatchAddress(i, "gstNo", e.target.value.toUpperCase())}
                        placeholder="27AAAAA0000A1Z5"
                        maxLength={15}
                        className="font-mono text-xs"
                      />
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
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
