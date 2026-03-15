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
import { ArrowLeft, FileText, CheckCircle, XCircle, Users, Download, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { use } from "react";

interface POAcceptanceDetail {
  id: string;
  acceptanceNo: string;
  acceptanceDate: string;
  committedDeliveryDate: string;
  remarks: string | null;
  attachmentUrl: string | null;
  status: string;
  followUpName: string | null;
  followUpEmail: string | null;
  followUpPhone: string | null;
  qualityName: string | null;
  qualityEmail: string | null;
  qualityPhone: string | null;
  accountsName: string | null;
  accountsEmail: string | null;
  accountsPhone: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  clientPurchaseOrder: {
    id: string;
    cpoNo: string;
    clientPoNumber: string;
    clientPoDate: string | null;
    projectName: string | null;
    contactPerson: string | null;
    paymentTerms: string | null;
    deliveryTerms: string | null;
    currency: string;
    grandTotal: number | null;
    subtotal: number | null;
    customer: {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
      contactPerson: string | null;
      email: string | null;
      phone: string | null;
      gstNo: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
    };
    quotation: { id: string; quotationNo: string; quotationDate: string };
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
      qtyOrdered: number;
      unitRate: number;
      amount: number;
    }[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  ISSUED: "default",
  CANCELLED: "destructive",
};

export default function POAcceptanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [acceptance, setAcceptance] = useState<POAcceptanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAcceptance();
  }, [id]);

  const fetchAcceptance = async () => {
    try {
      const response = await fetch(`/api/po-acceptance/${id}`);
      if (response.ok) {
        setAcceptance(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!acceptance) return;

    const confirmMsg =
      newStatus === "ISSUED"
        ? "Issue this PO Acceptance? The order will move to execution stage."
        : "Cancel this PO Acceptance?";
    if (!confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/po-acceptance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(
          newStatus === "ISSUED"
            ? "PO Acceptance issued — order moved to execution stage"
            : "PO Acceptance cancelled"
        );
        fetchAcceptance();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!acceptance) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        PO Acceptance not found
      </div>
    );
  }

  const cpo = acceptance.clientPurchaseOrder;
  const currencySymbol = cpo.currency === "INR" ? "\u20B9" : cpo.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={acceptance.acceptanceNo}
        description={`PO Acceptance for ${cpo.cpoNo}`}
        badge={acceptance.status}
        badgeVariant={(STATUS_COLORS[acceptance.status] as any) || "secondary"}
      >
        <div className="flex gap-2">
          {acceptance.status === "DRAFT" && (
            <>
              <Button
                onClick={() => updateStatus("ISSUED")}
                disabled={updating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Issue Acceptance
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateStatus("CANCELLED")}
                disabled={updating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* Acceptance & CPO Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceptance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Acceptance No" value={acceptance.acceptanceNo} highlight />
            <DetailRow
              label="Acceptance Date"
              value={format(new Date(acceptance.acceptanceDate), "dd/MM/yyyy")}
            />
            <DetailRow
              label="Committed Delivery Date"
              value={format(new Date(acceptance.committedDeliveryDate), "dd/MM/yyyy")}
              highlight
            />
            <DetailRow
              label="Created On"
              value={format(new Date(acceptance.createdAt), "dd/MM/yyyy HH:mm")}
            />
            <DetailRow label="Created By" value={acceptance.createdBy?.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client & Order Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Client" value={cpo.customer.name} />
            <DetailRow
              label="City / State"
              value={[cpo.customer.city, cpo.customer.state].filter(Boolean).join(", ") || null}
            />
            <DetailRow label="GST No" value={cpo.customer.gstNo} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client P.O.</span>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push(`/client-purchase-orders/${cpo.id}`)}
              >
                <FileText className="w-3 h-3 mr-1" />
                {cpo.cpoNo} ({cpo.clientPoNumber})
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quotation</span>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push(`/quotations/${cpo.quotation.id}`)}
              >
                <FileText className="w-3 h-3 mr-1" />
                {cpo.quotation.quotationNo}
              </Button>
            </div>
            <DetailRow label="Payment Terms" value={cpo.paymentTerms} />
            <DetailRow label="Delivery Terms" value={cpo.deliveryTerms} />
          </CardContent>
        </Card>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Client Contact / Department Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Follow-up */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Badge className="mb-2">Follow-up</Badge>
              <div>
                <div className="text-xs text-muted-foreground">Mr. / Ms.</div>
                <div className="text-sm font-medium">
                  {acceptance.followUpName || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm">{acceptance.followUpEmail || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Contact No</div>
                <div className="text-sm">{acceptance.followUpPhone || "-"}</div>
              </div>
            </div>

            {/* Quality / Inspection */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Badge variant="secondary" className="mb-2">
                Quality / Inspection
              </Badge>
              <div>
                <div className="text-xs text-muted-foreground">Mr. / Ms.</div>
                <div className="text-sm font-medium">
                  {acceptance.qualityName || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm">{acceptance.qualityEmail || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Contact No</div>
                <div className="text-sm">{acceptance.qualityPhone || "-"}</div>
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Badge variant="outline" className="mb-2">
                Accounts
              </Badge>
              <div>
                <div className="text-xs text-muted-foreground">Mr. / Ms.</div>
                <div className="text-sm font-medium">
                  {acceptance.accountsName || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm">{acceptance.accountsEmail || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Contact No</div>
                <div className="text-sm">{acceptance.accountsPhone || "-"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cpo.items.map((item) => (
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
                    <TableCell className="text-right font-semibold">
                      {item.qtyOrdered}
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

          <Separator className="my-4" />

          <div className="flex justify-end">
            <div className="space-y-1 text-right">
              <div className="text-sm text-muted-foreground">
                Items: {cpo.items.length}
              </div>
              <div className="text-lg font-bold">
                Grand Total: {currencySymbol}{" "}
                {(cpo.grandTotal || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachment */}
      {acceptance.attachmentUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Signed PO Acceptance Copy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">
                  {acceptance.attachmentUrl.split("/").pop() || "Attachment"}
                </span>
              </div>
              <a
                href={acceptance.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  View / Download
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {acceptance.remarks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {acceptance.remarks}
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
