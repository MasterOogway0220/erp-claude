"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Calculator, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { use } from "react";

interface ClientPODetail {
  id: string;
  cpoNo: string;
  cpoDate: string;
  clientPoNumber: string;
  clientPoDate: string | null;
  projectName: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  deliverySchedule: string | null;
  currency: string;
  subtotal: number | null;
  // Additional Charges
  freight: number | null;
  freightTaxApplicable: boolean;
  tpiCharges: number | null;
  tpiTaxApplicable: boolean;
  testingCharges: number | null;
  testingTaxApplicable: boolean;
  packingForwarding: number | null;
  packingTaxApplicable: boolean;
  insurance: number | null;
  insuranceTaxApplicable: boolean;
  otherCharges: number | null;
  otherChargesTaxApplicable: boolean;
  // GST
  additionalChargesTotal: number | null;
  taxableAmount: number | null;
  gstRate: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  supplierState: string | null;
  clientState: string | null;
  isInterState: boolean;
  roundOff: number | null;
  grandTotal: number | null;
  remarks: string | null;
  status: string;
  createdAt: string;
  customer: { name: string; city: string | null; contactPerson: string | null; state: string | null };
  quotation: {
    id: string;
    quotationNo: string;
    quotationDate: string;
    currency: string;
  };
  createdBy: { name: string } | null;
  items: {
    id: string;
    sNo: number;
    product: string | null;
    material: string | null;
    additionalSpec: string | null;
    sizeLabel: string | null;
    od: number | null;
    wt: number | null;
    ends: string | null;
    uom: string | null;
    hsnCode: string | null;
    qtyQuoted: number;
    qtyOrdered: number;
    unitRate: number;
    amount: number;
    deliveryDate: string | null;
    remark: string | null;
    totalOrderedAllCPOs: number;
    balanceQty: number;
    otherOrders: { cpoNo: string; qtyOrdered: number }[];
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  REGISTERED: "default",
  PARTIALLY_FULFILLED: "outline",
  FULLY_FULFILLED: "default",
  CANCELLED: "destructive",
};

export default function ClientPODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [clientPO, setClientPO] = useState<ClientPODetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientPO();
  }, [id]);

  const fetchClientPO = async () => {
    try {
      const response = await fetch(`/api/client-purchase-orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setClientPO(data);
      }
    } catch (error) {
      console.error("Failed to fetch client PO:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!clientPO) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Client Purchase Order not found
      </div>
    );
  }

  const currencySymbol = clientPO.currency === "INR" ? "\u20B9" : clientPO.currency;
  const fmtAmount = (val: number | null | undefined) =>
    (val ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build additional charges list for display
  const additionalCharges = [
    { label: "Freight", amount: clientPO.freight, taxApplicable: clientPO.freightTaxApplicable },
    { label: "TPI Charges", amount: clientPO.tpiCharges, taxApplicable: clientPO.tpiTaxApplicable },
    { label: "Testing Charges", amount: clientPO.testingCharges, taxApplicable: clientPO.testingTaxApplicable },
    { label: "Packing & Forwarding", amount: clientPO.packingForwarding, taxApplicable: clientPO.packingTaxApplicable },
    { label: "Insurance", amount: clientPO.insurance, taxApplicable: clientPO.insuranceTaxApplicable },
    { label: "Others", amount: clientPO.otherCharges, taxApplicable: clientPO.otherChargesTaxApplicable },
  ].filter((c) => c.amount && c.amount > 0);

  const hasCharges = additionalCharges.length > 0;
  const hasGST = (clientPO.cgst && clientPO.cgst > 0) || (clientPO.sgst && clientPO.sgst > 0) || (clientPO.igst && clientPO.igst > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={clientPO.cpoNo}
        description={`Client P.O.: ${clientPO.clientPoNumber}`}
        badge={clientPO.status.replace(/_/g, " ")}
        badgeVariant={
          (STATUS_COLORS[clientPO.status] as any) || "secondary"
        }
      >
        {clientPO.status === "REGISTERED" && (
          <Button
            onClick={() =>
              router.push(`/po-acceptance/create?cpoId=${clientPO.id}`)
            }
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Generate Acceptance
          </Button>
        )}
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Header Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Client Name" value={clientPO.customer.name} />
            <DetailRow label="City" value={clientPO.customer.city} />
            <DetailRow label="Contact Person" value={clientPO.contactPerson} />
            <DetailRow
              label="Client P.O. Number"
              value={clientPO.clientPoNumber}
              highlight
            />
            <DetailRow
              label="Client P.O. Date"
              value={
                clientPO.clientPoDate
                  ? format(new Date(clientPO.clientPoDate), "dd/MM/yyyy")
                  : null
              }
            />
            <DetailRow label="Project Name" value={clientPO.projectName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ref. Quotation</span>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() =>
                  router.push(`/quotations/${clientPO.quotation.id}`)
                }
              >
                <FileText className="w-3 h-3 mr-1" />
                {clientPO.quotation.quotationNo}
              </Button>
            </div>
            <DetailRow label="Currency" value={clientPO.currency} />
            <DetailRow label="Payment Terms" value={clientPO.paymentTerms} />
            <DetailRow label="Delivery Terms" value={clientPO.deliveryTerms} />
            <DetailRow label="Delivery Schedule" value={clientPO.deliverySchedule} />
            <DetailRow
              label="Registered On"
              value={format(new Date(clientPO.createdAt), "dd/MM/yyyy HH:mm")}
            />
            <DetailRow label="Created By" value={clientPO.createdBy?.name} />
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordered Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty Quoted</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientPO.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">
                          {item.product || "-"}
                        </div>
                        {item.material && (
                          <div className="text-xs text-muted-foreground">
                            {item.material}
                            {item.additionalSpec ? ` / ${item.additionalSpec}` : ""}
                          </div>
                        )}
                        {item.ends && (
                          <div className="text-xs text-muted-foreground">
                            Ends: {item.ends}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.sizeLabel || "-"}
                      {item.od && item.wt && (
                        <div className="text-xs text-muted-foreground">
                          OD: {item.od} / WT: {item.wt}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.qtyQuoted}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.qtyOrdered}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.balanceQty > 0 ? (
                        <span className="text-green-600">{item.balanceQty}</span>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Fully Ordered
                        </Badge>
                      )}
                      {item.otherOrders.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Other:{" "}
                          {item.otherOrders.map((o) => `${o.cpoNo}(${o.qtyOrdered})`).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.uom || "Mtr"}</TableCell>
                    <TableCell className="text-right">
                      {item.unitRate.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currencySymbol}{" "}
                      {item.amount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 pt-4 border-t flex justify-end">
            <span className="text-sm font-semibold">
              Material Value: {currencySymbol} {fmtAmount(clientPO.subtotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Charges */}
      {hasCharges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Charge Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Tax Applicable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {additionalCharges.map((charge) => (
                  <TableRow key={charge.label}>
                    <TableCell className="font-medium">{charge.label}</TableCell>
                    <TableCell className="text-right">
                      {currencySymbol} {fmtAmount(charge.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={charge.taxApplicable ? "default" : "secondary"}>
                        {charge.taxApplicable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 pt-3 border-t flex justify-end">
              <span className="text-sm font-semibold">
                Total Additional Charges: {currencySymbol}{" "}
                {fmtAmount(clientPO.additionalChargesTotal)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GST Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Commercial Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientPO.supplierState && clientPO.clientState && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={clientPO.isInterState ? "destructive" : "default"}>
                {clientPO.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {clientPO.supplierState} → {clientPO.clientState}
              </span>
            </div>
          )}

          <div className="max-w-md ml-auto">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Material Value</TableCell>
                  <TableCell className="text-right">
                    {currencySymbol} {fmtAmount(clientPO.subtotal)}
                  </TableCell>
                </TableRow>
                {hasCharges && (
                  <TableRow>
                    <TableCell className="font-medium">Additional Charges</TableCell>
                    <TableCell className="text-right">
                      {currencySymbol} {fmtAmount(clientPO.additionalChargesTotal)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">Taxable Amount</TableCell>
                  <TableCell className="text-right font-semibold">
                    {currencySymbol} {fmtAmount(clientPO.taxableAmount)}
                  </TableCell>
                </TableRow>
                {!clientPO.isInterState && clientPO.gstRate && clientPO.gstRate > 0 && (
                  <>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        CGST @ {Number(clientPO.gstRate) / 2}%
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol} {fmtAmount(clientPO.cgst)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        SGST @ {Number(clientPO.gstRate) / 2}%
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol} {fmtAmount(clientPO.sgst)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
                {clientPO.isInterState && clientPO.gstRate && clientPO.gstRate > 0 && (
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      IGST @ {Number(clientPO.gstRate)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {currencySymbol} {fmtAmount(clientPO.igst)}
                    </TableCell>
                  </TableRow>
                )}
                {clientPO.roundOff !== null && clientPO.roundOff !== 0 && (
                  <TableRow>
                    <TableCell className="text-muted-foreground">Round Off</TableCell>
                    <TableCell className="text-right">
                      {currencySymbol} {Number(clientPO.roundOff) > 0 ? "+" : ""}
                      {fmtAmount(clientPO.roundOff)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell className="font-bold text-base">Grand Total</TableCell>
                  <TableCell className="text-right font-bold text-base">
                    {currencySymbol} {fmtAmount(clientPO.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      {clientPO.remarks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {clientPO.remarks}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm ${
          highlight ? "font-semibold text-primary" : "text-foreground"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}
