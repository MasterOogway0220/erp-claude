"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FlaskConical, Save, Eye } from "lucide-react";
import { toast } from "sonner";

interface TestingItem {
  id: string;
  testName: string;
  applicableFor: string | null;
  isMandatory: boolean;
}

interface InspectionAgency {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
}

interface StockItem {
  id: string;
  heatNo: string | null;
  product: string | null;
  specification: string | null;
  sizeLabel: string | null;
  make: string | null;
  quantityMtr: string;
  pieces: number;
  status: string;
  form: string | null;
}

const UNITS = ["MTR", "NOS", "KG", "PCS", "TON", "SET", "LOT"];

export default function CreateLabLetterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [tests, setTests] = useState<TestingItem[]>([]);
  const [agencies, setAgencies] = useState<InspectionAgency[]>([]);

  const [selectedStockId, setSelectedStockId] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    labName: "",
    labAddress: "",
    poNumber: "",
    clientName: "",
    productDescription: "",
    itemCode: "",
    heatNo: "",
    make: "",
    specification: "",
    sizeLabel: "",
    quantity: "",
    unit: "",
    witnessRequired: false,
    tpiAgencyId: "",
    remarks: "",
  });

  useEffect(() => {
    fetchStocks();
    fetchTests();
    fetchAgencies();
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/inventory/stock");
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch {
      console.error("Failed to fetch stocks");
    }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/masters/testing");
      if (res.ok) {
        const data = await res.json();
        const items = data.tests || data.testingMasters || [];
        setTests(items);
        const mandatoryIds = items
          .filter((t: TestingItem) => t.isMandatory)
          .map((t: TestingItem) => t.id);
        setSelectedTestIds(mandatoryIds);
      }
    } catch {
      console.error("Failed to fetch testing masters");
    }
  };

  const fetchAgencies = async () => {
    try {
      const res = await fetch("/api/masters/inspection-agencies");
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.inspectionAgencies || data.agencies || []);
      }
    } catch {
      console.error("Failed to fetch inspection agencies");
    }
  };

  const handleStockSelect = (stockId: string) => {
    setSelectedStockId(stockId);
    const stock = stocks.find((s) => s.id === stockId);
    setSelectedStock(stock || null);
    if (stock) {
      setFormData((prev) => ({
        ...prev,
        heatNo: stock.heatNo || "",
        specification: stock.specification || "",
        sizeLabel: stock.sizeLabel || "",
        make: stock.make || "",
        productDescription: [stock.product, stock.form, stock.specification].filter(Boolean).join(" "),
        quantity: Number(stock.quantityMtr).toFixed(3),
        unit: "MTR",
      }));
    }
  };

  const toggleTest = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.heatNo.trim()) {
      toast.error("Heat number is required");
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error("Select at least one test");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quality/lab-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          inventoryStockId: selectedStockId || null,
          testIds: selectedTestIds,
          tpiAgencyId: formData.tpiAgencyId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create lab letter");
      }

      const data = await res.json();
      toast.success(`Lab Letter ${data.letterNo} created`);
      router.push(`/quality/lab-letters/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Lab Testing Letter"
        description="Generate a letter for external lab testing (Hydro, Chemical, Mechanical, Impact, IGC)"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lab Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lab Name</Label>
                <Input
                  value={formData.labName}
                  onChange={(e) => updateField("labName", e.target.value)}
                  placeholder="External testing laboratory name"
                />
              </div>
              <div className="space-y-2">
                <Label>Lab Address</Label>
                <Input
                  value={formData.labAddress}
                  onChange={(e) => updateField("labAddress", e.target.value)}
                  placeholder="Lab address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material Selection & Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stock Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select from Stock (optional)</Label>
                <Select value={selectedStockId || "NONE"} onValueChange={(v) => handleStockSelect(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock to auto-fill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {stocks.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.heatNo || "N/A"} — {stock.product || ""} {stock.sizeLabel || ""} ({stock.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Auto-fills material fields from inventory</p>
              </div>
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  value={formData.poNumber}
                  onChange={(e) => updateField("poNumber", e.target.value)}
                  placeholder="Purchase Order reference"
                />
              </div>
            </div>

            {/* Client & Product */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="Client who ordered the material"
                />
              </div>
              <div className="space-y-2">
                <Label>Product Description</Label>
                <Input
                  value={formData.productDescription}
                  onChange={(e) => updateField("productDescription", e.target.value)}
                  placeholder="e.g., Seamless Pipe ASTM A106 Gr. B"
                />
              </div>
            </div>

            {/* Item Code, Heat No, Make */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input
                  value={formData.itemCode}
                  onChange={(e) => updateField("itemCode", e.target.value)}
                  placeholder="Material / Item code"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Heat Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.heatNo}
                  onChange={(e) => updateField("heatNo", e.target.value)}
                  placeholder="Heat / Batch number"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Make / Manufacturer</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => updateField("make", e.target.value)}
                  placeholder="Mill / Manufacturer name"
                />
              </div>
            </div>

            {/* Specification, Size, Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Specification / Grade</Label>
                <Input
                  value={formData.specification}
                  onChange={(e) => updateField("specification", e.target.value)}
                  placeholder="ASTM A106 Gr. B"
                />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Input
                  value={formData.sizeLabel}
                  onChange={(e) => updateField("sizeLabel", e.target.value)}
                  placeholder='e.g., 2" NB x 3.91mm'
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  placeholder="Quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => updateField("unit", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tests to be Performed</CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tests.map((test) => (
                  <label
                    key={test.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTestIds.includes(test.id)
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTestIds.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 rounded"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{test.testName}</div>
                      {test.applicableFor && (
                        <div className="text-xs text-muted-foreground truncate">
                          {test.applicableFor}
                        </div>
                      )}
                      {test.isMandatory && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 mt-1">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No testing types configured. Please set up testing masters first.
              </div>
            )}
            {selectedTestIds.length > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                {selectedTestIds.length} test(s) selected
              </div>
            )}
          </CardContent>
        </Card>

        {/* Witness / TPI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Witness & TPI Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="witnessRequired"
                checked={formData.witnessRequired}
                onChange={(e) => updateField("witnessRequired", e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="witnessRequired" className="cursor-pointer">
                Third-Party Witness Required
              </Label>
            </div>

            {formData.witnessRequired && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>TPI Agency</Label>
                  <Select
                    value={formData.tpiAgencyId}
                    onValueChange={(v) => updateField("tpiAgencyId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select TPI agency" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name} ({agency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.tpiAgencyId && (() => {
                  const agency = agencies.find((a) => a.id === formData.tpiAgencyId);
                  return agency ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-3 space-y-1">
                      <div><span className="font-medium">Agency:</span> {agency.name}</div>
                      {agency.contactPerson && <div><span className="font-medium">Contact:</span> {agency.contactPerson}</div>}
                      {agency.phone && <div><span className="font-medium">Phone:</span> {agency.phone}</div>}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => updateField("remarks", e.target.value)}
                rows={2}
                placeholder="Any special instructions or notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Lab Letter"}
          </Button>
        </div>
      </form>
    </div>
  );
}
