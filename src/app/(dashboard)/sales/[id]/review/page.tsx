"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface SalesOrder {
  id: string;
  soNo: string;
  soDate: string;
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
  customerPoNo?: string;
  customerPoDate?: string;
  customerPoDocument?: string;
  poAcceptanceStatus: string;
  items: Array<{
    id: string;
    sNo: number;
    product: string;
    material: string;
    sizeLabel: string;
    quantity: number;
    unitRate: number;
    amount: number;
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

export default function CustomerPOReviewPage() {
  const router = useRouter();
  const params = useParams();
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchSalesOrder(params.id as string);
    }
  }, [params.id]);

  const fetchSalesOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/sales-orders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSalesOrder(data.salesOrder);
    } catch (error) {
      toast.error("Failed to load sales order");
      router.push("/sales");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: "ACCEPTED" | "REJECTED" | "HOLD") => {
    if (!salesOrder) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sales-orders/${salesOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poAcceptanceStatus: status,
          poReviewRemarks: remarks || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success(`Customer PO ${status.toLowerCase()}`);
      router.push(`/sales/${salesOrder.id}`);
    } catch (error) {
      toast.error("Failed to update PO status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!salesOrder) {
    return null;
  }

  // Build comparison data
  const comparisonData: ComparisonRow[] = [];
  if (salesOrder.quotation) {
    salesOrder.items.forEach((poItem, index) => {
      const quotItem = salesOrder.quotation!.items.find(
        (q) => q.sNo === poItem.sNo
      );

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

  const hasAnyVariance = comparisonData.some((row) => row.hasVariance);
  const canReview = salesOrder.poAcceptanceStatus === "PENDING";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer PO Review & Verification"
        description={`Review customer PO against reference quotation for SO: ${salesOrder.soNo}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>PO Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{salesOrder.customer.name}</div>
                <div className="text-sm text-muted-foreground">{salesOrder.customer.city || ""}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sales Order</div>
                <div className="font-mono font-medium">{salesOrder.soNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Customer PO Number</div>
                <div className="font-mono">{salesOrder.customerPoNo || "—"}</div>
              </div>
              {salesOrder.customerPoDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Customer PO Date</div>
                  <div>{format(new Date(salesOrder.customerPoDate), "dd MMM yyyy")}</div>
                </div>
              )}
            </div>

            {salesOrder.customerPoDocument && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">PO Document</div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={salesOrder.customerPoDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
            {salesOrder.quotation ? (
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Quotation Number</div>
                  <div className="font-mono font-medium">
                    {salesOrder.quotation.quotationNo}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Items</div>
                  <div>{salesOrder.quotation.items.length} item(s)</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No reference quotation linked</div>
            )}
          </CardContent>
        </Card>
      </div>

      {salesOrder.quotation && (
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
                    <TableHead rowSpan={2} className="w-12">
                      #
                    </TableHead>
                    <TableHead rowSpan={2}>Product</TableHead>
                    <TableHead rowSpan={2}>Material</TableHead>
                    <TableHead rowSpan={2}>Size</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">
                      Quantity (Mtr)
                    </TableHead>
                    <TableHead colSpan={3} className="text-center border-r">
                      Rate (₹)
                    </TableHead>
                    <TableHead colSpan={3} className="text-center">
                      Amount (₹)
                    </TableHead>
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
                    <TableRow
                      key={row.itemNo}
                      className={row.hasVariance ? "bg-yellow-50" : ""}
                    >
                      <TableCell>{row.itemNo}</TableCell>
                      <TableCell className="font-medium">{row.product}</TableCell>
                      <TableCell>{row.material}</TableCell>
                      <TableCell className="font-mono text-sm">{row.size}</TableCell>
                      <TableCell className="text-right">
                        {row.quotationQty.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.poQty.toFixed(3)}
                      </TableCell>
                      <TableCell
                        className={`text-right border-r font-medium ${
                          Math.abs(row.qtyVariance) > 0.01
                            ? row.qtyVariance > 0
                              ? "text-green-600"
                              : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.qtyVariance > 0 ? "+" : ""}
                        {row.qtyVariance.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.quotationRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.poRate.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right border-r font-medium ${
                          Math.abs(row.rateVariance) > 0.01
                            ? row.rateVariance > 0
                              ? "text-green-600"
                              : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.rateVariance > 0 ? "+" : ""}
                        {row.rateVariance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.quotationAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.poAmount.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          Math.abs(row.amountVariance) > 0.01
                            ? row.amountVariance > 0
                              ? "text-green-600"
                              : "text-red-600"
                            : ""
                        }`}
                      >
                        {row.amountVariance > 0 ? "+" : ""}
                        {row.amountVariance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!salesOrder.quotation && (
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
                Customer PO status: {salesOrder.poAcceptanceStatus}
              </p>
              <p className="text-sm mt-2">This PO has already been reviewed.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
