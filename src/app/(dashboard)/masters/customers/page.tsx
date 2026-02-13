"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MapPin,
  X,
  History,
} from "lucide-react";
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

interface DispatchAddress {
  id?: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  consigneeName: string;
  placeOfSupply: string;
  isDefault: boolean;
}

interface CustomerFormData {
  name: string;
  contactPerson: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  companyType: string;
  email: string;
  gstNo: string;
  gstType: string;
  panNo: string;
  industrySegment: string;
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  companyReferenceCode: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  paymentTerms: string;
  currency: string;
  defaultCurrency: string;
  isActive: boolean;
  tagIds: string[];
  dispatchAddresses: DispatchAddress[];
}

const emptyForm: CustomerFormData = {
  name: "",
  contactPerson: "",
  contactPersonEmail: "",
  contactPersonPhone: "",
  companyType: "BUYER",
  email: "",
  gstNo: "",
  gstType: "",
  panNo: "",
  industrySegment: "",
  addressLine1: "",
  addressLine2: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
  phone: "",
  companyReferenceCode: "",
  openingBalance: "0",
  creditLimit: "",
  creditDays: "",
  paymentTerms: "100% within 30 Days",
  currency: "INR",
  defaultCurrency: "INR",
  isActive: true,
  tagIds: [],
  dispatchAddresses: [],
};

const emptyAddress: DispatchAddress = {
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pincode: "",
  state: "",
  country: "India",
  consigneeName: "",
  placeOfSupply: "",
  isDefault: false,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/masters/customers?${params}`);
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/masters/tags");
      if (res.ok) {
        const d = await res.json();
        setTags(d.tags || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchTags();
  }, [fetchCustomers, fetchTags]);

  const handleOpen = (customer?: any) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name || "",
        contactPerson: customer.contactPerson || "",
        contactPersonEmail: customer.contactPersonEmail || "",
        contactPersonPhone: customer.contactPersonPhone || "",
        companyType: customer.companyType || "BUYER",
        email: customer.email || "",
        gstNo: customer.gstNo || "",
        gstType: customer.gstType || "",
        panNo: customer.panNo || "",
        industrySegment: customer.industrySegment || "",
        addressLine1: customer.addressLine1 || "",
        addressLine2: customer.addressLine2 || "",
        pincode: customer.pincode || "",
        city: customer.city || "",
        state: customer.state || "",
        country: customer.country || "India",
        phone: customer.phone || "",
        companyReferenceCode: customer.companyReferenceCode || "",
        openingBalance: customer.openingBalance?.toString() || "0",
        creditLimit: customer.creditLimit?.toString() || "",
        creditDays: customer.creditDays?.toString() || "",
        paymentTerms: customer.paymentTerms || "100% within 30 Days",
        currency: customer.currency || "INR",
        defaultCurrency: customer.defaultCurrency || "INR",
        isActive: customer.isActive ?? true,
        tagIds: customer.tags?.map((t: any) => t.tagId) || [],
        dispatchAddresses:
          customer.dispatchAddresses?.map((a: any) => ({
            id: a.id,
            label: a.label || "",
            addressLine1: a.addressLine1 || "",
            addressLine2: a.addressLine2 || "",
            city: a.city || "",
            pincode: a.pincode || "",
            state: a.state || "",
            country: a.country || "India",
            consigneeName: a.consigneeName || "",
            placeOfSupply: a.placeOfSupply || "",
            isDefault: a.isDefault || false,
          })) || [],
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setIsSheetOpen(true);
  };

  const handleClose = () => {
    setIsSheetOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/masters/customers/${editingId}`
        : "/api/masters/customers";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success(editingId ? "Customer updated" : "Customer created");
      handleClose();
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await fetch(`/api/masters/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Customer deleted");
      fetchCustomers();
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const handleGstFetch = () => {
    toast.info("GST lookup coming soon. Enter details manually for now.");
  };

  const addDispatchAddress = () => {
    setFormData({
      ...formData,
      dispatchAddresses: [...formData.dispatchAddresses, { ...emptyAddress }],
    });
  };

  const removeDispatchAddress = (index: number) => {
    setFormData({
      ...formData,
      dispatchAddresses: formData.dispatchAddresses.filter((_, i) => i !== index),
    });
  };

  const updateDispatchAddress = (
    index: number,
    field: keyof DispatchAddress,
    value: any
  ) => {
    const updated = [...formData.dispatchAddresses];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, dispatchAddresses: updated });
  };

  const toggleTag = (tagId: string) => {
    const current = formData.tagIds;
    if (current.includes(tagId)) {
      setFormData({ ...formData, tagIds: current.filter((t) => t !== tagId) });
    } else {
      setFormData({ ...formData, tagIds: [...current, tagId] });
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/masters/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (res.ok) {
        const tag = await res.json();
        setTags([...tags, tag]);
        setFormData({ ...formData, tagIds: [...formData.tagIds, tag.id] });
        setNewTagName("");
        toast.success("Tag created");
      }
    } catch {
      toast.error("Failed to create tag");
    }
  };

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-muted px-4 py-2 rounded-md -mx-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {children}
      </h3>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Master"
        description="Manage customer information for quotations and sales orders"
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>GST No.</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.companyType || "BUYER"}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.contactPerson || "\u2014"}</TableCell>
                  <TableCell>{c.email || "\u2014"}</TableCell>
                  <TableCell>{c.city || "\u2014"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.gstNo || "\u2014"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c.tags?.map((t: any) => (
                        <Badge key={t.id} variant="secondary" className="text-xs">
                          {t.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Customer Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="!max-w-2xl w-full overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit" : "Add"} Customer</SheetTitle>
            <SheetDescription>
              {editingId ? "Update customer details" : "Create a new customer record"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-6">
            {/* Section 1: Contact Person Details */}
            <SectionHeader>Contact Person Details</SectionHeader>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={formData.contactPersonEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPersonEmail: e.target.value })
                    }
                    placeholder="contact@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone No.</Label>
                  <Input
                    value={formData.contactPersonPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPersonPhone: e.target.value })
                    }
                    placeholder="+91 ..."
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Company Details */}
            <SectionHeader>Company Details</SectionHeader>
            <div className="space-y-4">
              {/* Company Type Toggle */}
              <div className="space-y-2">
                <Label className="text-xs">Company Type</Label>
                <div className="flex gap-4">
                  {[
                    { value: "BUYER", label: "Buyer" },
                    { value: "SUPPLIER", label: "Supplier" },
                    { value: "BOTH", label: "Both" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="companyType"
                        value={opt.value}
                        checked={formData.companyType === opt.value}
                        onChange={(e) =>
                          setFormData({ ...formData, companyType: e.target.value })
                        }
                        className="h-4 w-4 text-primary"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Company Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="company@email.com"
                  />
                </div>
              </div>

              {/* GST Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">GST Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.gstNo}
                      onChange={(e) =>
                        setFormData({ ...formData, gstNo: e.target.value.toUpperCase() })
                      }
                      placeholder="22AAAAA0000A1Z5"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleGstFetch}>
                      Fetch
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GST Type</Label>
                  <Select
                    value={formData.gstType || "NONE"}
                    onValueChange={(v) =>
                      setFormData({ ...formData, gstType: v === "NONE" ? "" : v })
                    }
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Verify the GST number to capture details automatically.
              </p>

              {/* PAN & Industry Segment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PAN Number</Label>
                  <Input
                    value={formData.panNo}
                    onChange={(e) =>
                      setFormData({ ...formData, panNo: e.target.value.toUpperCase() })
                    }
                    placeholder="AAAAA0000A"
                    maxLength={10}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Industry Segment</Label>
                  <Input
                    value={formData.industrySegment}
                    onChange={(e) =>
                      setFormData({ ...formData, industrySegment: e.target.value })
                    }
                    placeholder="e.g., Oil & Gas, Power, Petrochemical"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <Label className="text-xs">Address Line 1 *</Label>
                <Input
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address Line 2</Label>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine2: e.target.value })
                  }
                  placeholder="Area, landmark"
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pincode</Label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    placeholder="400004"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Mumbai"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Select
                    value={formData.state || "NONE"}
                    onValueChange={(v) =>
                      setFormData({ ...formData, state: v === "NONE" ? "" : v })
                    }
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
                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telephone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 22 23634200"
                />
              </div>
            </div>

            {/* Section 3: Additional Details */}
            <SectionHeader>Additional Details</SectionHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company Reference Code</Label>
                  <Input
                    value={formData.companyReferenceCode}
                    onChange={(e) =>
                      setFormData({ ...formData, companyReferenceCode: e.target.value })
                    }
                    placeholder="Internal reference"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Opening Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalance: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Credit Limit (&#8377;)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: e.target.value })
                    }
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credit Days</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.creditDays}
                    onChange={(e) =>
                      setFormData({ ...formData, creditDays: e.target.value })
                    }
                    placeholder="e.g., 30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Terms</Label>
                  <Input
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentTerms: e.target.value })
                    }
                    placeholder="e.g., 100% within 30 Days"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default Currency</Label>
                  <Select
                    value={formData.defaultCurrency}
                    onValueChange={(v) =>
                      setFormData({ ...formData, defaultCurrency: v, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      variant={formData.tagIds.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={createTag}>
                    + Assign Tag
                  </Button>
                </div>
              </div>

              {/* Status */}
              {editingId && (
                <div className="flex items-center gap-3">
                  <Label className="text-xs">Status</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={() => setFormData({ ...formData, isActive: true })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={!formData.isActive}
                        onChange={() => setFormData({ ...formData, isActive: false })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Inactive</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Dispatch Addresses */}
            <SectionHeader>Dispatch Addresses</SectionHeader>
            <div className="space-y-4">
              {formData.dispatchAddresses.map((addr, i) => (
                <Card key={i} className="relative">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Dispatch Address {i + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDispatchAddress(i)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={addr.label}
                          onChange={(e) => updateDispatchAddress(i, "label", e.target.value)}
                          placeholder="e.g., Site Office, Warehouse"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Consignee Name</Label>
                        <Input
                          value={addr.consigneeName}
                          onChange={(e) => updateDispatchAddress(i, "consigneeName", e.target.value)}
                          placeholder="Consignee name"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address Line 1</Label>
                      <Input
                        value={addr.addressLine1}
                        onChange={(e) => updateDispatchAddress(i, "addressLine1", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address Line 2</Label>
                      <Input
                        value={addr.addressLine2}
                        onChange={(e) => updateDispatchAddress(i, "addressLine2", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">City</Label>
                        <Input
                          value={addr.city}
                          onChange={(e) => updateDispatchAddress(i, "city", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pincode</Label>
                        <Input
                          value={addr.pincode}
                          onChange={(e) => updateDispatchAddress(i, "pincode", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">State</Label>
                        <Select
                          value={addr.state || "NONE"}
                          onValueChange={(v) =>
                            updateDispatchAddress(i, "state", v === "NONE" ? "" : v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Select</SelectItem>
                            {INDIAN_STATES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Place of Supply</Label>
                        <Select
                          value={addr.placeOfSupply || "NONE"}
                          onValueChange={(v) =>
                            updateDispatchAddress(i, "placeOfSupply", v === "NONE" ? "" : v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="PoS" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Select</SelectItem>
                            {INDIAN_STATES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={addDispatchAddress}>
                <Plus className="h-4 w-4 mr-2" />
                Add Dispatch Address
              </Button>
            </div>

            <Separator />

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-600">
                100% Safe and Compliant with Indian Govt Laws and Regulations
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
