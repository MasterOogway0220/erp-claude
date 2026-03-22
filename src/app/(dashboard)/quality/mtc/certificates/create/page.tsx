"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  Plus,
  Wand2,
  FileText,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/page-loading";

interface MTCItem {
  itemNo: string;
  description: string;
  constructionType: string;
  dimensionStandard: string;
  sizeOD1: string;
  sizeWT1: string;
  sizeOD2: string;
  sizeWT2: string;
  quantity: number;
  heatNo: string;
  rawMaterial: string;
  clientItemCode: string;
}

function generateHeatNo(): string {
  const now = new Date();
  const yy = format(now, "yy");
  const mm = format(now, "MM");
  const dd = format(now, "dd");
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `H-${yy}${mm}${dd}-${seq}`;
}

function CreateMTCPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [issuedAgainst, setIssuedAgainst] = useState<
    "PURCHASE_ORDER" | "QUOTATION"
  >("PURCHASE_ORDER");
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [materialSpecs, setMaterialSpecs] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    poNo: "",
    poDate: "",
    quotationId: "",
    quotationNo: "",
    projectName: "",
    otherReference: "",
    materialSpecId: "",
    additionalRequirement: "",
    certificateDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    remarks: "",
  });

  const [items, setItems] = useState<MTCItem[]>([]);

  // Loading states
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [loadingPODetail, setLoadingPODetail] = useState(false);
  const [loadingQuotationDetail, setLoadingQuotationDetail] = useState(false);

  // Source items from PO or Quotation
  const [sourceItems, setSourceItems] = useState<any[]>([]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchPurchaseOrders();
    fetchQuotations();
    fetchCustomers();
    fetchMaterialSpecs();
  }, []);

  const fetchPurchaseOrders = async () => {
    setLoadingPOs(true);
    try {
      const res = await fetch("/api/purchase/orders");
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.orders || data.purchaseOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch POs:", error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const fetchQuotations = async () => {
    setLoadingQuotations(true);
    try {
      const res = await fetch("/api/quotations");
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.quotations || []);
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    } finally {
      setLoadingQuotations(false);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/masters/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchMaterialSpecs = async () => {
    setLoadingSpecs(true);
    try {
      const res = await fetch("/api/mtc/material-specs");
      if (res.ok) {
        const data = await res.json();
        setMaterialSpecs(data.materialSpecs || []);
      }
    } catch (error) {
      console.error("Failed to fetch material specs:", error);
    } finally {
      setLoadingSpecs(false);
    }
  };

  // When a PO is selected, fetch full details
  const handlePOSelect = async (poId: string) => {
    const po = purchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    setSelectedPO(po);
    setSelectedQuotation(null);
    setSelectedItems([]);
    setItems([]);
    setSourceItems([]);

    setFormData((prev) => ({
      ...prev,
      customerName:
        po.customer?.name || po.salesOrder?.customer?.name || po.vendorName || "",
      poNo: po.poNo || "",
      poDate: po.poDate ? format(new Date(po.poDate), "yyyy-MM-dd") : "",
      projectName: po.projectName || po.subject || "",
      quotationId: "",
      quotationNo: "",
    }));

    // Fetch full PO details for items
    setLoadingPODetail(true);
    try {
      const res = await fetch(`/api/purchase/orders/${poId}`);
      if (res.ok) {
        const data = await res.json();
        const poData = data.purchaseOrder || data;
        setSelectedPO(poData);
        setSourceItems(poData.items || []);

        // Update customer if available from detail
        if (poData.customer?.name || poData.salesOrder?.customer?.name) {
          setFormData((prev) => ({
            ...prev,
            customerName:
              poData.customer?.name ||
              poData.salesOrder?.customer?.name ||
              prev.customerName,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch PO details:", error);
      toast.error("Failed to load PO details");
    } finally {
      setLoadingPODetail(false);
    }
  };

  // When a quotation is selected, fetch full details
  const handleQuotationSelect = async (quotationId: string) => {
    const q = quotations.find((q: any) => q.id === quotationId);
    if (!q) return;

    setSelectedQuotation(q);
    setSelectedPO(null);
    setSelectedItems([]);
    setItems([]);
    setSourceItems([]);

    setFormData((prev) => ({
      ...prev,
      quotationId: q.id,
      quotationNo: q.quotationNo || "",
      customerName: q.customer?.name || "",
      projectName: q.projectName || q.subject || "",
      poNo: "",
      poDate: "",
    }));

    // Fetch full quotation details for items
    setLoadingQuotationDetail(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`);
      if (res.ok) {
        const data = await res.json();
        const qData = data.quotation || data;
        setSelectedQuotation(qData);
        setSourceItems(qData.items || []);

        if (qData.customer?.name) {
          setFormData((prev) => ({
            ...prev,
            customerName: qData.customer.name,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch quotation details:", error);
      toast.error("Failed to load quotation details");
    } finally {
      setLoadingQuotationDetail(false);
    }
  };

  // When material spec is selected
  const handleMaterialSpecSelect = (specId: string) => {
    const spec = materialSpecs.find((s: any) => s.id === specId);
    setFormData((prev) => ({ ...prev, materialSpecId: specId }));

    if (spec) {
      // Update existing items with spec values
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          constructionType: spec.constructionType || item.constructionType,
          dimensionStandard: spec.dimensionStandard || item.dimensionStandard,
        }))
      );
    }
  };

  // Toggle item selection from source items
  const toggleItemSelection = (index: number) => {
    const isSelected = selectedItems.includes(index);

    if (isSelected) {
      setSelectedItems((prev) => prev.filter((i) => i !== index));
      setItems((prev) => prev.filter((_, i) => {
        const originalIndex = selectedItems.indexOf(
          selectedItems.filter((si) => si !== index)[i] ?? -1
        );
        return originalIndex !== -1;
      }));
      // Rebuild items from remaining selections
      const remaining = selectedItems.filter((i) => i !== index);
      rebuildItems(remaining);
    } else {
      if (selectedItems.length >= 4) {
        toast.error("Maximum 4 items allowed per MTC certificate");
        return;
      }
      const newSelection = [...selectedItems, index];
      setSelectedItems(newSelection);
      rebuildItems(newSelection);
    }
  };

  const rebuildItems = (indices: number[]) => {
    const spec = materialSpecs.find(
      (s: any) => s.id === formData.materialSpecId
    );

    const newItems: MTCItem[] = indices.map((idx) => {
      const srcItem = sourceItems[idx];
      // Preserve existing edits if item was already in the list
      const existingItem = items.find(
        (item) => item.itemNo === String(idx + 1)
      );

      if (existingItem) return existingItem;

      return {
        itemNo: String(idx + 1),
        description:
          srcItem?.description || srcItem?.itemDescription || srcItem?.product || "",
        constructionType: spec?.constructionType || "",
        dimensionStandard: spec?.dimensionStandard || "",
        sizeOD1: srcItem?.sizeOD || srcItem?.od || srcItem?.size || "",
        sizeWT1: srcItem?.sizeWT || srcItem?.wt || srcItem?.wallThickness || "",
        sizeOD2: "",
        sizeWT2: "",
        quantity: srcItem?.quantity || srcItem?.qty || 1,
        heatNo: "",
        rawMaterial: "",
        clientItemCode: srcItem?.clientItemCode || "",
      };
    });

    setItems(newItems);
  };

  // Update a specific item field
  const updateItem = (index: number, field: keyof MTCItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Auto-generate heat number for an item
  const autoGenerateHeatNoForItem = (index: number) => {
    updateItem(index, "heatNo", generateHeatNo());
  };

  // Get the selected material spec for read-only display
  const selectedSpec = materialSpecs.find(
    (s: any) => s.id === formData.materialSpecId
  );

  const handleSubmit = async () => {
    if (!formData.materialSpecId) {
      toast.error("Select material specification");
      return;
    }
    if (items.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    if (items.length > 4) {
      toast.error("Maximum 4 items allowed");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mtc/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuedAgainst,
          customerId: formData.customerId || null,
          customerName: formData.customerName,
          poNo: formData.poNo || null,
          poDate: formData.poDate || null,
          quotationId: formData.quotationId || null,
          quotationNo: formData.quotationNo || null,
          projectName: formData.projectName || null,
          otherReference: formData.otherReference || null,
          materialSpecId: formData.materialSpecId,
          additionalRequirement: formData.additionalRequirement || null,
          certificateDate: formData.certificateDate,
          notes: formData.notes || null,
          remarks: formData.remarks || null,
          items: items.map((item, idx) => ({
            ...item,
            sortOrder: idx,
            quantity: parseInt(String(item.quantity)) || 1,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create MTC");
        return;
      }

      const data = await res.json();
      toast.success(`MTC Certificate ${data.certificateNo || ""} created`);
      router.push(
        `/quality/mtc/certificates/${data.certificate?.id || data.id}`
      );
    } catch (err) {
      toast.error("Failed to create MTC");
    } finally {
      setLoading(false);
    }
  };

  const hasSourceSelected = !!(selectedPO || selectedQuotation);
  const hasMaterialSpec = !!formData.materialSpecId;
  const hasItemsSelected = items.length > 0;
  const isLoadingDetail = loadingPODetail || loadingQuotationDetail;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create MTC Certificate"
        description="Generate a new Mill Test Certificate"
      >
        <Button
          variant="outline"
          onClick={() => router.push("/quality/mtc/certificates")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Step 1: MTC Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Step 1
            </Badge>
            Select MTC Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer border-2 transition-all ${
                issuedAgainst === "PURCHASE_ORDER"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
              onClick={() => {
                setIssuedAgainst("PURCHASE_ORDER");
                setSelectedQuotation(null);
                setSelectedItems([]);
                setItems([]);
                setSourceItems([]);
                setFormData((prev) => ({
                  ...prev,
                  quotationId: "",
                  quotationNo: "",
                  customerId: "",
                  customerName: "",
                  projectName: "",
                }));
              }}
            >
              <CardContent className="pt-6 text-center">
                <ShoppingCart
                  className={`h-8 w-8 mx-auto mb-2 ${
                    issuedAgainst === "PURCHASE_ORDER"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold">MTC Against Purchase Order</h3>
                <p className="text-sm text-muted-foreground">
                  Issue MTC for items received against a PO
                </p>
                {issuedAgainst === "PURCHASE_ORDER" && (
                  <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                )}
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer border-2 transition-all ${
                issuedAgainst === "QUOTATION"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
              onClick={() => {
                setIssuedAgainst("QUOTATION");
                setSelectedPO(null);
                setSelectedItems([]);
                setItems([]);
                setSourceItems([]);
                setFormData((prev) => ({
                  ...prev,
                  poNo: "",
                  poDate: "",
                  customerName: "",
                  projectName: "",
                }));
              }}
            >
              <CardContent className="pt-6 text-center">
                <FileText
                  className={`h-8 w-8 mx-auto mb-2 ${
                    issuedAgainst === "QUOTATION"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold">MTC Against Quotation</h3>
                <p className="text-sm text-muted-foreground">
                  Issue MTC for items linked to a quotation
                </p>
                {issuedAgainst === "QUOTATION" && (
                  <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Step 2
            </Badge>
            Basic Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issuedAgainst === "PURCHASE_ORDER" ? (
              <>
                <div className="space-y-2">
                  <Label>Purchase Order *</Label>
                  <Select
                    value={selectedPO?.id || ""}
                    onValueChange={handlePOSelect}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingPOs ? "Loading..." : "Select Purchase Order"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders.map((po: any) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.poNo} — {po.vendor?.name || po.vendorName || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    value={formData.customerName}
                    readOnly
                    className="bg-muted"
                    placeholder="Auto-filled from PO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PO Date</Label>
                  <Input
                    type="date"
                    value={formData.poDate}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(v) => {
                      const c = customers.find((c: any) => c.id === v);
                      setFormData((prev) => ({
                        ...prev,
                        customerId: v,
                        customerName: c?.name || "",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingCustomers ? "Loading..." : "Select Customer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quotation Number *</Label>
                  <Select
                    value={formData.quotationId}
                    onValueChange={handleQuotationSelect}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingQuotations
                            ? "Loading..."
                            : "Select Quotation"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {quotations.map((q: any) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quotationNo || q.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={formData.projectName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    projectName: e.target.value,
                  }))
                }
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label>Certificate Date</Label>
              <Input
                type="date"
                value={formData.certificateDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    certificateDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Other Reference</Label>
              <Input
                value={formData.otherReference}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    otherReference: e.target.value,
                  }))
                }
                placeholder="Other reference"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Material Details (shown after PO/Quotation selected) */}
      {hasSourceSelected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step 3
              </Badge>
              Material Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Material Specification *</Label>
                <Select
                  value={formData.materialSpecId || "NONE"}
                  onValueChange={(v) => {
                    if (v === "NONE") return;
                    handleMaterialSpecSelect(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSpecs ? "Loading..." : "Select Material Spec"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>-- Select Material Spec --</SelectItem>
                    {materialSpecs.map((spec: any) => (
                      <SelectItem key={spec.id} value={spec.id}>
                        {spec.materialSpec || spec.specification}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {materialSpecs.length === 0 && !loadingSpecs && (
                  <p className="text-xs text-amber-600 mt-1">
                    No material specs found. Create one in Quality &gt; Material Specs first.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Additional Requirement</Label>
                <Select
                  value={formData.additionalRequirement || "NONE"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      additionalRequirement: v === "NONE" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">-- None --</SelectItem>
                    <SelectItem value="NACE MR0175">NACE MR0175</SelectItem>
                    <SelectItem value="NACE MR0103">NACE MR0103</SelectItem>
                    <SelectItem value="NACE MR0175/MR0103">NACE MR0175/MR0103</SelectItem>
                    <SelectItem value="H2 SERVICE">H2 SERVICE</SelectItem>
                    <SelectItem value="IBR">IBR</SelectItem>
                    <SelectItem value="GALVANISED">GALVANISED</SelectItem>
                    <SelectItem value="LOW TEMPERATURE">LOW TEMPERATURE</SelectItem>
                    <SelectItem value="HIGH TEMPERATURE">HIGH TEMPERATURE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedSpec && (
                <>
                  <div className="space-y-2">
                    <Label>Starting Material</Label>
                    <Input
                      value={selectedSpec.startingMaterial || "—"}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heat Treatment</Label>
                    <Input
                      value={selectedSpec.heatTreatment || "—"}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Item Selection (shown after material spec selected) */}
      {hasSourceSelected && hasMaterialSpec && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Step 4
                </Badge>
                Select Items
              </CardTitle>
              <Badge variant="outline">{selectedItems.length}/4 selected</Badge>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              Maximum 4 items. All must have same material specification.
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDetail ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading items...</p>
              </div>
            ) : sourceItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  No items found for the selected{" "}
                  {issuedAgainst === "PURCHASE_ORDER"
                    ? "purchase order"
                    : "quotation"}
                  .
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Select</TableHead>
                      <TableHead className="w-[70px]">Item No</TableHead>
                      <TableHead>Description / Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceItems.map((item: any, idx: number) => {
                      const isChecked = selectedItems.includes(idx);
                      return (
                        <TableRow key={item.id || `src-${idx}`}>
                          <TableCell>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItemSelection(idx)}
                              disabled={!isChecked && selectedItems.length >= 4}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.description ||
                              item.itemDescription ||
                              item.product ||
                              "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.size ||
                              item.dimension ||
                              (item.sizeOD
                                ? `${item.sizeOD}" x ${item.sizeWT || ""}`
                                : "—")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.quantity || item.qty || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Item Details (shown after items selected) */}
      {hasItemsSelected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step 5
              </Badge>
              Item Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <Card key={`item-detail-${index}`} className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">Item {item.itemNo}</Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Construction Type</Label>
                        <Select
                          value={item.constructionType}
                          onValueChange={(v) =>
                            updateItem(index, "constructionType", v)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEAMLESS">SEAMLESS</SelectItem>
                            <SelectItem value="WELDED">WELDED</SelectItem>
                            <SelectItem value="FORGED">FORGED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Dimension Standard</Label>
                        <Input
                          value={item.dimensionStandard}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "dimensionStandard",
                              e.target.value
                            )
                          }
                          placeholder="e.g. ASME B16.9"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size OD1</Label>
                        <Input
                          value={item.sizeOD1}
                          onChange={(e) =>
                            updateItem(index, "sizeOD1", e.target.value)
                          }
                          placeholder="OD"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size WT1</Label>
                        <Input
                          value={item.sizeWT1}
                          onChange={(e) =>
                            updateItem(index, "sizeWT1", e.target.value)
                          }
                          placeholder="Wall Thickness"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size OD2 (Reducer)</Label>
                        <Input
                          value={item.sizeOD2}
                          onChange={(e) =>
                            updateItem(index, "sizeOD2", e.target.value)
                          }
                          placeholder="OD2 (optional)"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size WT2 (Reducer)</Label>
                        <Input
                          value={item.sizeWT2}
                          onChange={(e) =>
                            updateItem(index, "sizeWT2", e.target.value)
                          }
                          placeholder="WT2 (optional)"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          min={1}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Heat No</Label>
                        <div className="flex gap-1">
                          <Input
                            value={item.heatNo}
                            onChange={(e) =>
                              updateItem(index, "heatNo", e.target.value)
                            }
                            placeholder="Heat number"
                            className="h-8"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 shrink-0"
                            onClick={() => autoGenerateHeatNoForItem(index)}
                            title="Auto Generate Heat No"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Raw Material</Label>
                        <Input
                          value={item.rawMaterial}
                          onChange={(e) =>
                            updateItem(index, "rawMaterial", e.target.value)
                          }
                          placeholder="Raw material"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Client Item Code</Label>
                        <Input
                          value={item.clientItemCode}
                          onChange={(e) =>
                            updateItem(index, "clientItemCode", e.target.value)
                          }
                          placeholder="Client item code"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Remarks */}
      {hasItemsSelected && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Remarks for certificate..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Actions */}
      {hasItemsSelected && (
        <div className="flex justify-end gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/quality/mtc/certificates")}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create MTC Certificate"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CreateMTCPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateMTCPage />
    </Suspense>
  );
}
