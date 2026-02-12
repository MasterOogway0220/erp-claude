"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { PipeSizeSelect } from "@/components/shared/pipe-size-select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface EnquiryItem {
  product: string;
  material: string;
  additionalSpec: string;
  size: string;
  ends: string;
  quantity: string;
  uom: string;
  remarks: string;
}

const emptyItem: EnquiryItem = {
  product: "",
  material: "",
  additionalSpec: "",
  size: "",
  ends: "",
  quantity: "",
  uom: "Mtr",
  remarks: "",
};

export default function CreateEnquiryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    buyerName: "",
    buyerDesignation: "",
    buyerEmail: "",
    buyerContact: "",
    clientInquiryNo: "",
    clientInquiryDate: "",
    enquiryMode: "EMAIL",
    projectName: "",
  });
  const [items, setItems] = useState<EnquiryItem[]>([emptyItem]);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Fetch buyers filtered by selected customer
  const { data: buyersData } = useQuery({
    queryKey: ["buyers", formData.customerId],
    queryFn: async () => {
      const res = await fetch(
        `/api/masters/buyers?customerId=${formData.customerId}`
      );
      if (!res.ok) throw new Error("Failed to fetch buyers");
      return res.json();
    },
    enabled: !!formData.customerId,
  });

  // Create enquiry mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create enquiry");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Enquiry created successfully");
      router.push(`/enquiries/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to create enquiry");
    },
  });

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof EnquiryItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleCustomerChange = (value: string) => {
    // When customer changes, reset buyer selection and buyer fields
    setFormData({
      ...formData,
      customerId: value,
      buyerId: "",
      buyerName: "",
      buyerDesignation: "",
      buyerEmail: "",
      buyerContact: "",
    });
  };

  const handleBuyerChange = (value: string) => {
    if (value === "__manual__") {
      // Manual entry: clear buyerId and buyer fields so user can type
      setFormData({
        ...formData,
        buyerId: "",
        buyerName: "",
        buyerDesignation: "",
        buyerEmail: "",
        buyerContact: "",
      });
      return;
    }

    // Find the selected buyer from the fetched list
    const selectedBuyer = buyersData?.buyers?.find(
      (b: any) => b.id === value
    );
    if (selectedBuyer) {
      setFormData({
        ...formData,
        buyerId: selectedBuyer.id,
        buyerName: selectedBuyer.buyerName || "",
        buyerDesignation: selectedBuyer.designation || "",
        buyerEmail: selectedBuyer.email || "",
        buyerContact: selectedBuyer.mobile || selectedBuyer.telephone || "",
      });
    }
  };

  const isBuyerSelected = !!formData.buyerId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    createMutation.mutate({ ...formData, items });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="New Enquiry"
          description="Register a new customer enquiry"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Buyer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer & Buyer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.customers?.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="buyerId">Buyer</Label>
                <Select
                  value={formData.buyerId || "__manual__"}
                  onValueChange={handleBuyerChange}
                  disabled={!formData.customerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Manual Entry</SelectItem>
                    {buyersData?.buyers?.map((buyer: any) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.buyerName}
                        {buyer.designation ? ` - ${buyer.designation}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="buyerName">Buyer Name</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerName: e.target.value })
                    }
                    readOnly={isBuyerSelected}
                    className={isBuyerSelected ? "bg-muted" : ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="buyerDesignation">Buyer Designation</Label>
                  <Input
                    id="buyerDesignation"
                    value={formData.buyerDesignation}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerDesignation: e.target.value })
                    }
                    readOnly={isBuyerSelected}
                    className={isBuyerSelected ? "bg-muted" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="buyerEmail">Buyer Email</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerEmail: e.target.value })
                    }
                    readOnly={isBuyerSelected}
                    className={isBuyerSelected ? "bg-muted" : ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="buyerContact">Buyer Contact</Label>
                  <Input
                    id="buyerContact"
                    value={formData.buyerContact}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerContact: e.target.value })
                    }
                    readOnly={isBuyerSelected}
                    className={isBuyerSelected ? "bg-muted" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientInquiryNo">Client Inquiry No.</Label>
                  <Input
                    id="clientInquiryNo"
                    value={formData.clientInquiryNo}
                    onChange={(e) =>
                      setFormData({ ...formData, clientInquiryNo: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="clientInquiryDate">Client Inquiry Date</Label>
                  <Input
                    id="clientInquiryDate"
                    type="date"
                    value={formData.clientInquiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, clientInquiryDate: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="enquiryMode">Enquiry Mode</Label>
                  <Select
                    value={formData.enquiryMode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, enquiryMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="WALK_IN">Walk-In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData({ ...formData, projectName: e.target.value })
                  }
                  placeholder="e.g., 2x660MW NTPC Solapur"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enquiry Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid gap-4 p-4 border rounded-lg relative">
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}

                <ProductMaterialSelect
                  product={item.product}
                  material={item.material}
                  additionalSpec={item.additionalSpec}
                  onProductChange={(val) => updateItem(index, "product", val)}
                  onMaterialChange={(val) => updateItem(index, "material", val)}
                  onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                  showAdditionalSpec
                  onAutoFill={(fields) => {
                    if (fields.ends) updateItem(index, "ends", fields.ends);
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Size</Label>
                    <PipeSizeSelect
                      value={item.size}
                      onChange={(text) => updateItem(index, "size", text)}
                      onSelect={(size) => {
                        updateItem(index, "size", size.sizeLabel);
                      }}
                      label="Size"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Ends</Label>
                    <Select
                      value={item.ends}
                      onValueChange={(value) => updateItem(index, "ends", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BE">BE (Bevelled End)</SelectItem>
                        <SelectItem value="PE">PE (Plain End)</SelectItem>
                        <SelectItem value="NPTM">NPTM</SelectItem>
                        <SelectItem value="BSPT">BSPT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Quantity (Mtr)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={item.remarks}
                    onChange={(e) => updateItem(index, "remarks", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Enquiry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
