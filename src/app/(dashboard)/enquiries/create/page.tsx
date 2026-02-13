"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { PipeSizeSelect } from "@/components/shared/pipe-size-select";
import { Plus, Trash2, ArrowLeft, UserPlus } from "lucide-react";
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
  const queryClient = useQueryClient();
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
    projectLocation: "",
    endUser: "",
    priority: "NORMAL",
    expectedClosureDate: "",
    remarks: "",
  });
  const [items, setItems] = useState<EnquiryItem[]>([emptyItem]);
  const [isNewBuyerDialogOpen, setIsNewBuyerDialogOpen] = useState(false);
  const [newBuyerData, setNewBuyerData] = useState({
    buyerName: "",
    designation: "",
    email: "",
    mobile: "",
  });

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

  // Create new buyer mutation
  const createBuyerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/masters/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, customerId: formData.customerId }),
      });
      if (!res.ok) throw new Error("Failed to create buyer");
      return res.json();
    },
    onSuccess: (buyer) => {
      queryClient.invalidateQueries({ queryKey: ["buyers", formData.customerId] });
      setFormData({
        ...formData,
        buyerId: buyer.id,
        buyerName: buyer.buyerName || "",
        buyerDesignation: buyer.designation || "",
        buyerEmail: buyer.email || "",
        buyerContact: buyer.mobile || buyer.telephone || "",
      });
      setIsNewBuyerDialogOpen(false);
      setNewBuyerData({ buyerName: "", designation: "", email: "", mobile: "" });
      toast.success("Buyer created successfully");
    },
    onError: () => toast.error("Failed to create buyer"),
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
    if (value === "__add_new__") {
      setIsNewBuyerDialogOpen(true);
      return;
    }

    if (value === "NONE") {
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
                <div className="flex gap-2">
                  <Select
                    value={formData.buyerId || "NONE"}
                    onValueChange={handleBuyerChange}
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No buyer selected</SelectItem>
                      {buyersData?.buyers?.map((buyer: any) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.buyerName}
                          {buyer.designation ? ` - ${buyer.designation}` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__">
                        + Add New Buyer
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!formData.customerId}
                    onClick={() => setIsNewBuyerDialogOpen(true)}
                    title="Add New Buyer"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
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
                      <SelectItem value="TENDER_PORTAL">Tender Portal</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expectedClosureDate">Expected Closure Date</Label>
                  <Input
                    id="expectedClosureDate"
                    type="date"
                    value={formData.expectedClosureDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedClosureDate: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="projectLocation">Project Location</Label>
                  <Input
                    id="projectLocation"
                    value={formData.projectLocation}
                    onChange={(e) =>
                      setFormData({ ...formData, projectLocation: e.target.value })
                    }
                    placeholder="e.g., Solapur, Maharashtra"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endUser">End User</Label>
                <Input
                  id="endUser"
                  value={formData.endUser}
                  onChange={(e) =>
                    setFormData({ ...formData, endUser: e.target.value })
                  }
                  placeholder="e.g., NTPC Ltd."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  rows={3}
                  placeholder="Any additional notes or remarks..."
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

      {/* Add New Buyer Dialog */}
      <Dialog open={isNewBuyerDialogOpen} onOpenChange={setIsNewBuyerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Buyer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Buyer Name *</Label>
              <Input
                value={newBuyerData.buyerName}
                onChange={(e) =>
                  setNewBuyerData({ ...newBuyerData, buyerName: e.target.value })
                }
                placeholder="Enter buyer name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Designation</Label>
              <Input
                value={newBuyerData.designation}
                onChange={(e) =>
                  setNewBuyerData({ ...newBuyerData, designation: e.target.value })
                }
                placeholder="e.g., Purchase Manager"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newBuyerData.email}
                onChange={(e) =>
                  setNewBuyerData({ ...newBuyerData, email: e.target.value })
                }
                placeholder="buyer@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Mobile</Label>
              <Input
                value={newBuyerData.mobile}
                onChange={(e) =>
                  setNewBuyerData({ ...newBuyerData, mobile: e.target.value })
                }
                placeholder="+91 9876543210"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewBuyerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!newBuyerData.buyerName.trim()) {
                  toast.error("Buyer name is required");
                  return;
                }
                createBuyerMutation.mutate(newBuyerData);
              }}
              disabled={createBuyerMutation.isPending}
            >
              {createBuyerMutation.isPending ? "Creating..." : "Add Buyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
