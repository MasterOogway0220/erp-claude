"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  city?: string;
}

interface TpiAgency {
  id: string;
  name: string;
  code: string;
}

interface OfferItem {
  product: string;
  material: string;
  sizeLabel: string;
  heatNo: string;
  specification: string;
  quantity: string;
  quantityReady: string;
  uom: string;
  colourCodeRequired: boolean;
  colourCode: string;
  remark: string;
}

const EMPTY_ITEM: OfferItem = {
  product: "",
  material: "",
  sizeLabel: "",
  heatNo: "",
  specification: "",
  quantity: "",
  quantityReady: "",
  uom: "Mtr",
  colourCodeRequired: false,
  colourCode: "",
  remark: "",
};

export default function CreateInspectionOfferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tpiAgencies, setTpiAgencies] = useState<TpiAgency[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    poNumber: "",
    projectName: "",
    inspectionLocation: "",
    proposedInspectionDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    tpiAgencyId: "",
    quantityReady: "",
    remarks: "",
  });

  const [items, setItems] = useState<OfferItem[]>([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    fetchCustomers();
    fetchTpiAgencies();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/masters/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTpiAgencies = async () => {
    try {
      const res = await fetch("/api/masters/inspection-agencies");
      if (res.ok) {
        const data = await res.json();
        setTpiAgencies(data.agencies || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OfferItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a client");
      return;
    }
    if (items.every((item) => !item.product && !item.heatNo)) {
      toast.error("Please add at least one item with product or heat number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quality/inspection-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      const data = await res.json();
      toast.success(`Inspection Offer ${data.offerNo} created`);
      router.push(`/quality/inspection-offers/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Inspection Offer"
        description="Generate inspection offer letter and related documents"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Inspection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(v) => setFormData({ ...formData, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.city ? ` (${c.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  placeholder="Client PO / CPO reference"
                />
              </div>

              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Project name"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Inspection Location</Label>
                <Input
                  value={formData.inspectionLocation}
                  onChange={(e) => setFormData({ ...formData, inspectionLocation: e.target.value })}
                  placeholder="e.g. NPS Warehouse, Mumbai"
                />
              </div>

              <div className="space-y-2">
                <Label>Proposed Inspection Date</Label>
                <Input
                  type="date"
                  value={formData.proposedInspectionDate}
                  onChange={(e) => setFormData({ ...formData, proposedInspectionDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>TPI Agency</Label>
                <Select
                  value={formData.tpiAgencyId}
                  onValueChange={(v) => setFormData({ ...formData, tpiAgencyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select TPI Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    {tpiAgencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Ready (Summary)</Label>
                <Input
                  value={formData.quantityReady}
                  onChange={(e) => setFormData({ ...formData, quantityReady: e.target.value })}
                  placeholder="e.g. 500 Mtr of SS316L Pipes"
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional remarks"
                  rows={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Item Details</CardTitle>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border rounded-lg"
                >
                  <div className="md:col-span-2">
                    <Label className="text-xs">Product</Label>
                    <Input
                      value={item.product}
                      onChange={(e) => updateItem(index, "product", e.target.value)}
                      placeholder="Product"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Material</Label>
                    <Input
                      value={item.material}
                      onChange={(e) => updateItem(index, "material", e.target.value)}
                      placeholder="Material grade"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Size</Label>
                    <Input
                      value={item.sizeLabel}
                      onChange={(e) => updateItem(index, "sizeLabel", e.target.value)}
                      placeholder="Size"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Heat No.</Label>
                    <Input
                      value={item.heatNo}
                      onChange={(e) => updateItem(index, "heatNo", e.target.value)}
                      placeholder="Heat number"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Qty Ready</Label>
                    <Input
                      value={item.quantityReady}
                      onChange={(e) => updateItem(index, "quantityReady", e.target.value)}
                      placeholder="Ready"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Colour Code</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={item.colourCodeRequired}
                        onCheckedChange={(checked) =>
                          updateItem(index, "colourCodeRequired", !!checked)
                        }
                      />
                      {item.colourCodeRequired && (
                        <Input
                          value={item.colourCode}
                          onChange={(e) => updateItem(index, "colourCode", e.target.value)}
                          placeholder="Code"
                          className="h-7 w-16 text-xs"
                        />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Specification</Label>
                    <Input
                      value={item.specification}
                      onChange={(e) => updateItem(index, "specification", e.target.value)}
                      placeholder="Spec"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-9"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Inspection Offer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
