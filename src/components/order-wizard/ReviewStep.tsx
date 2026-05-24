"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { SizeSelect } from "@/components/shared/size-select";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Pencil,
  X,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import type { WizardOrder } from "./OrderWizard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SOItem {
  id?: string;
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  od: number;
  wt: number;
  ends: string;
  quantity: number;
  unitRate: number;
  amount: number;
  deliveryDate: string;
}

interface SalesOrderDetail {
  id: string;
  soNo: string;
  soDate: string;
  status: string;
  poAcceptanceStatus: string;
  customerPoNo?: string;
  customerPoDate?: string;
  customerPoDocument?: string;
  projectName?: string;
  deliverySchedule?: string;
  paymentTerms?: string;
  customer: {
    name: string;
    city?: string;
  };
  quotation?: {
    id: string;
    quotationNo: string;
    items: Array<{
      sNo: number;
      product: string;
      material: string;
      sizeLabel: string;
      quantity: number;
      unitRate: number;
      amount: number;
    }>;
  };
  items: Array<{
    id: string;
    sNo: number;
    product: string;
    material: string;
    additionalSpec?: string;
    sizeLabel: string;
    od?: number;
    wt?: number;
    ends?: string;
    quantity: number;
    unitRate: number;
    amount: number;
    deliveryDate?: string;
  }>;
}

interface ComparisonRow {
  itemNo: number;
  product: string;
  material: string;
  size: string;
  quotationQty: number;
  poQty: number;
  qtyVariance: number;
  quotationRate: number;
  poRate: number;
  rateVariance: number;
  quotationAmount: number;
  poAmount: number;
  amountVariance: number;
  hasVariance: boolean;
}

interface ReviewStepProps {
  order: WizardOrder;
  onComplete: (complete: boolean) => void;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// ReviewStep
// ---------------------------------------------------------------------------

export function ReviewStep({ order, onComplete, readOnly = false }: ReviewStepProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode state (from edit/page.tsx)
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customerPoNo: "",
    customerPoDate: "",
    customerPoDocument: "",
    projectName: "",
    deliverySchedule: "",
    paymentTerms: "",
  });
  const [editItems, setEditItems] = useState<SOItem[]>([]);

  // Review decision state (from review/page.tsx)
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const so: SalesOrderDetail = data.salesOrder;
      setDetail(so);
      populateEditForm(so);
      // Signal completion if already reviewed
      if (so.poAcceptanceStatus === "ACCEPTED") {
        onComplete(true);
      }
    } catch {
      toast.error("Failed to load sales order");
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = (so: SalesOrderDetail) => {
    setFormData({
      customerPoNo: so.customerPoNo || "",
      customerPoDate: so.customerPoDate
        ? format(new Date(so.customerPoDate), "yyyy-MM-dd")
        : "",
      customerPoDocument: so.customerPoDocument || "",
      projectName: so.projectName || "",
      deliverySchedule: so.deliverySchedule || "",
      paymentTerms: so.paymentTerms || "",
    });
    setEditItems(
      so.items.map((item) => ({
        id: item.id,
        product: item.product || "",
        material: item.material || "",
        additionalSpec: item.additionalSpec || "",
        sizeLabel: item.sizeLabel || "",
        od: Number(item.od) || 0,
        wt: Number(item.wt) || 0,
        ends: item.ends || "",
        quantity: Number(item.quantity) || 0,
        unitRate: Number(item.unitRate) || 0,
        amount: Number(item.amount) || 0,
        deliveryDate: item.deliveryDate
          ? format(new Date(item.deliveryDate), "yyyy-MM-dd")
          : "",
      }))
    );
  };

  // ---------------------------------------------------------------------------
  // Edit helpers (from edit/page.tsx)
  // ---------------------------------------------------------------------------

  const addItem = () => {
    setEditItems([
      ...editItems,
      {
        product: "",
        material: "",
        additionalSpec: "",
        sizeLabel: "",
        od: 0,
        wt: 0,
        ends: "",
        quantity: 0,
        unitRate: 0,
        amount: 0,
        deliveryDate: format(new Date(), "yyyy-MM-dd"),
      },
    ]);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SOItem, value: unknown) => {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitRate") {
      const qty =
        field === "quantity"
          ? parseFloat(value as string) || 0
          : updated[index].quantity;
      const rate =
        field === "unitRate"
          ? parseFloat(value as string) || 0
          : updated[index].unitRate;
      updated[index].amount = Math.max(0, qty * rate);
    }
    setEditItems(updated);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editItems.length === 0) {
      toast.error("At least one item is required");
      return;
    }
    for (let i = 0; i < editItems.length; i++) {
      if (!editItems[i].quantity || editItems[i].quantity <= 0) {
        toast.error(`Item ${i + 1}: Quantity must be greater than zero`);
        return;
      }
      if (!editItems[i].unitRate || editItems[i].unitRate <= 0) {
        toast.error(`Item ${i + 1}: Unit rate must be greater than zero`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customerPoDate: formData.customerPoDate || null,
          items: editItems,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update");
      }
      toast.success("Order updated");
      setEditMode(false);
      await fetchOrder();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Review decision (from review/page.tsx)
  // ---------------------------------------------------------------------------

  const handleUpdateStatus = async (status: "ACCEPTED" | "REJECTED" | "HOLD") => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-orders/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poAcceptanceStatus: status,
          poReviewRemarks: remarks || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Customer PO ${status.toLowerCase()}`);
      // Refresh local data
      await fetchOrder();
      // Gate: only ACCEPTED unlocks Next
      onComplete(status === "ACCEPTED");
    } catch {
      toast.error("Failed to update PO status");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageLoading />;
  if (!detail) return null;

  const canReview = detail.poAcceptanceStatus === "PENDING" && !readOnly;
  const canEdit = detail.status === "OPEN" && !readOnly;

  // Build comparison data
  const comparisonData: ComparisonRow[] = [];
  const quotationItems = detail.quotation?.items || [];
  if (detail.quotation && quotationItems.length > 0) {
    detail.items.forEach((poItem) => {
      const quotItem = quotationItems.find((q) => q.sNo === poItem.sNo);
      const quotQty = quotItem ? Number(quotItem.quantity) : 0;
      const poQty = Number(poItem.quantity);
      const quotRate = quotItem ? Number(quotItem.unitRate) : 0;
      const poRate = Number(poItem.unitRate);
      const quotAmount = quotItem ? Number(quotItem.amount) : 0;
      const poAmount = Number(poItem.amount);
      const qtyVariance = poQty - quotQty;
      const rateVariance = poRate - quotRate;
      const amountVariance = poAmount - quotAmount;
      const hasVariance =
        Math.abs(qtyVariance) > 0.01 ||
        Math.abs(rateVariance) > 0.01 ||
        Math.abs(amountVariance) > 0.01;
      comparisonData.push({
        itemNo: poItem.sNo,
        product: poItem.product,
        material: poItem.material,
        size: poItem.sizeLabel,
        quotationQty: quotQty,
        poQty,
        qtyVariance,
        quotationRate: quotRate,
        poRate,
        rateVariance,
        quotationAmount: quotAmount,
        poAmount,
        amountVariance,
        hasVariance,
      });
    });
  }

  const hasAnyVariance = comparisonData.some((r) => r.hasVariance);

  // ---- Edit mode UI ----
  if (editMode) {
    return (
      <form onSubmit={handleSaveEdit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Order: {detail.soNo}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerPoNo">Customer PO Number</Label>
                <Input
                  id="customerPoNo"
                  value={formData.customerPoNo}
                  onChange={(e) => setFormData({ ...formData, customerPoNo: e.target.value })}
                  placeholder="Enter PO number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPoDate">Customer PO Date</Label>
                <Input
                  id="customerPoDate"
                  type="date"
                  value={formData.customerPoDate}
                  onChange={(e) => setFormData({ ...formData, customerPoDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPoDocument">PO Document URL</Label>
                <Input
                  id="customerPoDocument"
                  value={formData.customerPoDocument}
                  onChange={(e) => setFormData({ ...formData, customerPoDocument: e.target.value })}
                  placeholder="Document URL or path"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
                <Input
                  id="deliverySchedule"
                  value={formData.deliverySchedule}
                  onChange={(e) => setFormData({ ...formData, deliverySchedule: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border rounded-lg"
                >
                  <div className="md:col-span-4">
                    <ProductMaterialSelect
                      product={item.product}
                      material={item.material}
                      additionalSpec={item.additionalSpec}
                      onProductChange={(val) => updateItem(index, "product", val)}
                      onMaterialChange={(val) => updateItem(index, "material", val)}
                      onAdditionalSpecChange={(val) => updateItem(index, "additionalSpec", val)}
                      showAdditionalSpec
                      onAutoFill={() => {}}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Size</Label>
                    <SizeSelect
                      value={item.sizeLabel}
                      onChange={(text) => updateItem(index, "sizeLabel", text)}
                      onSelect={(size) => {
                        updateItem(index, "sizeLabel", size.sizeLabel);
                        updateItem(index, "od", size.od);
                        updateItem(index, "wt", size.wt);
                      }}
                      label="Size"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Qty (Mtr)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Unit Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.unitRate}
                      onChange={(e) => updateItem(index, "unitRate", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Delivery Date</Label>
                    <Input
                      type="date"
                      value={item.deliveryDate}
                      onChange={(e) => updateItem(index, "deliveryDate", e.target.value)}
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="md:col-span-12 text-right text-sm text-muted-foreground">
                    Amount: {item.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="text-right text-lg font-semibold pt-4 border-t">
                Total: {editItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    );
  }

  // ---- Review mode UI ----
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer PO Review &amp; Verification</h2>
          <p className="text-sm text-muted-foreground">
            Review customer PO against reference quotation for SO: {detail.soNo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              detail.poAcceptanceStatus === "ACCEPTED"
                ? "default"
                : detail.poAcceptanceStatus === "REJECTED"
                ? "destructive"
                : "secondary"
            }
          >
            {detail.poAcceptanceStatus}
          </Badge>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit Order
            </Button>
          )}
        </div>
      </div>

      {/* PO info + quotation reference */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>PO Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{detail.customer.name}</div>
                <div className="text-sm text-muted-foreground">{detail.customer.city || ""}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Order</div>
                <div className="font-mono font-medium">{detail.soNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Customer PO Number</div>
                <div className="font-mono">{detail.customerPoNo || "—"}</div>
              </div>
              {detail.customerPoDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Customer PO Date</div>
                  <div>{format(new Date(detail.customerPoDate), "dd MMM yyyy")}</div>
                </div>
              )}
            </div>

            {detail.customerPoDocument && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">PO Document</div>
                <Button variant="outline" size="sm" asChild>
                  <a href={detail.customerPoDocument} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" />
                    View PO Document
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference Quotation</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.quotation ? (
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Quotation Number</div>
                  <div className="font-mono font-medium">{detail.quotation.quotationNo}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Items</div>
                  <div>{(detail.quotation.items || []).length} item(s)</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No reference quotation linked</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      {detail.quotation && (
        <>
          {hasAnyVariance && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Variances Detected</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Customer PO has differences from the reference quotation. Please review
                      carefully before acceptance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>PO vs Quotation Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="w-12">#</TableHead>
                    <TableHead rowSpan={2}>Product</TableHead>
                    <TableHead rowSpan={2}>Material</TableHead>
                    <TableHead rowSpan={2}>Size</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Quantity (Mtr)</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Rate (₹)</TableHead>
                    <TableHead colSpan={3} className="text-center">Amount (₹)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-right">Quotation</TableHead>
                    <TableHead className="text-right">PO</TableHead>
                    <TableHead className="text-right border-r">Variance</TableHead>
                    <TableHead className="text-right">Quotation</TableHead>
                    <TableHead className="text-right">PO</TableHead>
                    <TableHead className="text-right border-r">Variance</TableHead>
                    <TableHead className="text-right">Quotation</TableHead>
                    <TableHead className="text-right">PO</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((row) => (
                    <TableRow key={row.itemNo} className={row.hasVariance ? "bg-yellow-50" : ""}>
                      <TableCell>{row.itemNo}</TableCell>
                      <TableCell className="font-medium">{row.product}</TableCell>
                      <TableCell>{row.material}</TableCell>
                      <TableCell className="font-mono text-sm">{row.size}</TableCell>
                      <TableCell className="text-right">{row.quotationQty.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-medium">{row.poQty.toFixed(3)}</TableCell>
                      <TableCell
                        className={`text-right border-r font-medium ${
                          Math.abs(row.qtyVariance) > 0.01
                            ? row.qtyVariance > 0 ? "text-green-600" : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.qtyVariance > 0 ? "+" : ""}{row.qtyVariance.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">{row.quotationRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{row.poRate.toFixed(2)}</TableCell>
                      <TableCell
                        className={`text-right border-r font-medium ${
                          Math.abs(row.rateVariance) > 0.01
                            ? row.rateVariance > 0 ? "text-green-600" : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.rateVariance > 0 ? "+" : ""}{row.rateVariance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{row.quotationAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{row.poAmount.toFixed(2)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          Math.abs(row.amountVariance) > 0.01
                            ? row.amountVariance > 0 ? "text-green-600" : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.amountVariance > 0 ? "+" : ""}{row.amountVariance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!detail.quotation && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reference quotation available for comparison.</p>
              <p className="text-sm mt-2">
                Manual review required. Verify customer PO details before acceptance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review decision */}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>Review Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Add any remarks or notes about this PO review..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                onClick={() => handleUpdateStatus("ACCEPTED")}
                disabled={submitting}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept PO
              </Button>
              <Button
                onClick={() => handleUpdateStatus("HOLD")}
                disabled={submitting}
                variant="outline"
                className="flex-1"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Hold PO
              </Button>
              <Button
                onClick={() => handleUpdateStatus("REJECTED")}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject PO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!canReview && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                Customer PO status: {detail.poAcceptanceStatus}
              </p>
              <p className="text-sm mt-2">This PO has already been reviewed.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
