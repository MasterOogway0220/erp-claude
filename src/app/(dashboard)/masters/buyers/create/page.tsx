"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
}

interface BuyerFormData {
  customerId: string;
  buyerName: string;
  designation: string;
  email: string;
  mobile: string;
  telephone: string;
}

const emptyForm: BuyerFormData = {
  customerId: "",
  buyerName: "",
  designation: "",
  email: "",
  mobile: "",
  telephone: "",
};

export default function CreateBuyerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<BuyerFormData>(emptyForm);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/masters/customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch {
        toast.error("Failed to load customers");
      }
    };
    fetchCustomers();
  }, []);

  const update = (field: keyof BuyerFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!formData.buyerName.trim()) {
      toast.error("Buyer name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/masters/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create buyer");
        return;
      }

      toast.success("Buyer created successfully");
      router.push("/masters/buyers");
    } catch {
      toast.error("Failed to create buyer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Buyer" description="Create a new buyer contact for a customer">
        <Button variant="outline" onClick={() => router.push("/masters/buyers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="buyer-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Buyer"}
        </Button>
      </PageHeader>

      <form id="buyer-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Buyer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(v) => update("customerId", v)}
              >
                <SelectTrigger id="customerId">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input
                id="buyerName"
                value={formData.buyerName}
                onChange={(e) => update("buyerName", e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => update("designation", e.target.value)}
                placeholder="e.g. Purchase Manager"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. buyer@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                  placeholder="e.g. 022-12345678"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
