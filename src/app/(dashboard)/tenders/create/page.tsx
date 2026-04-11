"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
}

interface TenderItem {
  product: string;
  material: string;
  sizeLabel: string;
  quantity: string;
  uom: string;
  estimatedRate: string;
  amount: string;
  remarks: string;
}

const emptyItem = (): TenderItem => ({
  product: "",
  material: "",
  sizeLabel: "",
  quantity: "",
  uom: "",
  estimatedRate: "",
  amount: "",
  remarks: "",
});

export default function CreateTenderPage() {
  const router = useRouter();

  // Basic Info
  const [tenderSource, setTenderSource] = useState("");
  const [organization, setOrganization] = useState("");
  const [tenderRef, setTenderRef] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [openingDate, setOpeningDate] = useState("");

  // Project Details
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  // EMD
  const [emdRequired, setEmdRequired] = useState(false);
  const [emdAmount, setEmdAmount] = useState("");
  const [emdType, setEmdType] = useState("");

  // Items
  const [items, setItems] = useState<TenderItem[]>([emptyItem()]);

  // Remarks
  const [remarks, setRemarks] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/masters/customers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
      })
      .catch(() => {});
  }, []);

  function updateItem(index: number, field: keyof TenderItem, value: string) {
    setItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "quantity" || field === "estimatedRate") {
          const qty = parseFloat(field === "quantity" ? value : item.quantity) || 0;
          const rate = parseFloat(field === "estimatedRate" ? value : item.estimatedRate) || 0;
          next.amount = qty && rate ? (qty * rate).toFixed(2) : "";
        }
        return next;
      });
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        tenderSource: tenderSource || null,
        organization: organization || null,
        tenderRef: tenderRef || null,
        closingDate: closingDate || null,
        openingDate: openingDate || null,
        projectName: projectName || null,
        location: location || null,
        estimatedValue: estimatedValue || null,
        currency,
        customerId: customerId || null,
        emdRequired,
        emdAmount: emdRequired ? emdAmount || null : null,
        emdType: emdRequired ? emdType || null : null,
        remarks: remarks || null,
        items: items
          .filter((item) => item.product || item.material || item.quantity)
          .map((item) => ({
            product: item.product || null,
            material: item.material || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            estimatedRate: item.estimatedRate || null,
            remarks: item.remarks || null,
          })),
      };

      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create tender");
      }

      const data = await res.json();
      toast.success("Tender created successfully");
      router.push(`/tenders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create tender");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Create Tender" description="Register a new tender">
        <Button variant="outline" onClick={() => router.push("/tenders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Tender Source</Label>
                <Select value={tenderSource} onValueChange={setTenderSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GeM">GeM</SelectItem>
                    <SelectItem value="BHEL">BHEL</SelectItem>
                    <SelectItem value="NTPC">NTPC</SelectItem>
                    <SelectItem value="IOCL">IOCL</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. NTPC Ltd."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tenderRef">Tender Ref</Label>
                <Input
                  id="tenderRef"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  placeholder="Client's reference number"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="closingDate">Closing Date</Label>
                <Input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openingDate">Opening Date</Label>
                <Input
                  id="openingDate"
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Project location"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Customer (Optional)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
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
            </div>
          </CardContent>
        </Card>

        {/* EMD Details */}
        <Card>
          <CardHeader>
            <CardTitle>EMD Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="emdRequired"
                  checked={emdRequired}
                  onCheckedChange={setEmdRequired}
                />
                <Label htmlFor="emdRequired">EMD Required</Label>
              </div>

              {emdRequired && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="emdAmount">EMD Amount</Label>
                    <Input
                      id="emdAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={emdAmount}
                      onChange={(e) => setEmdAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>EMD Type</Label>
                    <Select value={emdType} onValueChange={setEmdType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BG">BG (Bank Guarantee)</SelectItem>
                        <SelectItem value="DD">DD (Demand Draft)</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="FDR">FDR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-24">UOM</TableHead>
                    <TableHead className="w-32">Est. Rate</TableHead>
                    <TableHead className="w-32">Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.product}
                          onChange={(e) => updateItem(index, "product", e.target.value)}
                          placeholder="Product"
                          className="min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material}
                          onChange={(e) => updateItem(index, "material", e.target.value)}
                          placeholder="Material"
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.sizeLabel}
                          onChange={(e) => updateItem(index, "sizeLabel", e.target.value)}
                          placeholder="Size"
                          className="min-w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.uom}
                          onChange={(e) => updateItem(index, "uom", e.target.value)}
                          placeholder="Nos"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.estimatedRate}
                          onChange={(e) => updateItem(index, "estimatedRate", e.target.value)}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.amount}
                          readOnly
                          placeholder="0.00"
                          className="bg-muted cursor-default"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.remarks}
                          onChange={(e) => updateItem(index, "remarks", e.target.value)}
                          placeholder="Remarks"
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional remarks or notes..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/tenders")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Create Tender"}
          </Button>
        </div>
      </form>
    </div>
  );
}
