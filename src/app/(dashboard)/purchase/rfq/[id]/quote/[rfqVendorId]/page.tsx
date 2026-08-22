"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { prItemFields, prItemLabel } from "@/lib/purchase/pr-item-fields";

/**
 * Enter a vendor's quotation against an RFQ.
 *
 * This was a modal on the RFQ detail screen. It never fitted: the commercial
 * terms are a five-column row and the item table is seven columns wide, so the
 * dialog scrolled in both directions and clipped "Valid Until" and "TPI
 * Charges" outright. A quotation is a document being transcribed field by field
 * from a vendor's email — it needs a page, not a box.
 *
 * The vendor is fixed by the URL (`rfqVendorId` — the RFQVendor join row, not
 * the vendor master), which is also what the API keys the quotation on.
 */
export default function EnterVendorQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const rfqVendorId = params.rfqVendorId as string;

  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quotationRef, setQuotationRef] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [priceBasis, setPriceBasis] = useState("EX_WORKS");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [freight, setFreight] = useState("0");
  const [testingCharges, setTestingCharges] = useState("0");
  const [tpiCharges, setTpiCharges] = useState("0");
  const [packingForwarding, setPackingForwarding] = useState("0");
  const [gstRate, setGstRate] = useState("18");
  const [items, setItems] = useState<any[]>([]);

  const fetchRFQ = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchase/rfq/${id}`);
      if (!res.ok) {
        toast.error("Failed to load RFQ");
        return;
      }
      const data = await res.json();
      const loaded = data.rfq || data;
      setRfq(loaded);

      // The lines being quoted are the requisition's — an RFQ has none itself.
      const prItems = loaded?.purchaseRequisition?.items || loaded?.items || [];
      setItems(
        prItems.map((item: any, idx: number) => ({
          prItemId: item.id,
          sNo: item.sNo ?? idx + 1,
          label: prItemLabel(item),
          technicalRequirements: item.technicalRequirements || "",
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.sizeLabel || "",
          quantity: Number(item.quantity) || 0,
          unit: prItemFields(item).unit,
          unitRate: 0,
          amount: 0,
          deliveryDays: 0,
          remarks: "",
        }))
      );
    } catch {
      toast.error("Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchRFQ();
  }, [id, fetchRFQ]);

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "unitRate") {
        updated[index].amount = Number(value) * updated[index].quantity;
      }
      return updated;
    });
  };

  const materialTotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  const handleSave = async () => {
    if (!quotationDate) {
      toast.error("Please enter the quotation date");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase/rfq/${id}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The route keys the quotation on the RFQVendor row, not the vendor
          // master. The old modal sent `vendorId` and every save was rejected
          // with "RFQ Vendor ID is required".
          rfqVendorId,
          quotationRef,
          quotationDate,
          validUntil,
          priceBasis,
          deliveryDays: Number(deliveryDays),
          paymentTerms,
          freight: Number(freight),
          testingCharges: Number(testingCharges),
          tpiCharges: Number(tpiCharges),
          packingForwarding: Number(packingForwarding),
          gstRate: Number(gstRate),
          items,
        }),
      });
      if (res.ok) {
        toast.success("Quotation saved");
        router.push(`/purchase/rfq/${id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save quotation");
      }
    } catch {
      toast.error("Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  const rfqVendor = rfq?.vendors?.find((v: any) => v.id === rfqVendorId);

  if (!rfq || !rfqVendor) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor not found on this RFQ"
          description="The vendor may have been removed from the enquiry."
        />
        <Button variant="outline" onClick={() => router.push(`/purchase/rfq/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFQ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enter Vendor Quotation"
        description={`${rfqVendor.vendor?.name ?? "Vendor"} — against ${rfq.rfqNo}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/purchase/rfq/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save Quotation"}
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={rfqVendor.vendor?.name ?? ""} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Quotation Reference</Label>
              <Input
                value={quotationRef}
                onChange={(e) => setQuotationRef(e.target.value)}
                placeholder="Vendor's quote ref no."
              />
            </div>
            <div className="space-y-2">
              <Label>Price Basis</Label>
              <Select value={priceBasis} onValueChange={setPriceBasis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EX_WORKS">Ex-Works</SelectItem>
                  <SelectItem value="FOR">FOR</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Quotation Date *</Label>
              <Input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Days</Label>
              <Input
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30 days from invoice"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commercial Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Freight</Label>
              <Input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Testing Charges</Label>
              <Input
                type="number"
                value={testingCharges}
                onChange={(e) => setTestingCharges(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>TPI Charges</Label>
              <Input
                type="number"
                value={tpiCharges}
                onChange={(e) => setTpiCharges(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Packing &amp; Forwarding</Label>
              <Input
                type="number"
                value={packingForwarding}
                onChange={(e) => setPackingForwarding(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>GST Rate %</Label>
              <Input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item-wise Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Item</TableHead>
                  {/* What the client requires of this material. The vendor is
                      quoting against these, not just the size. */}
                  <TableHead className="min-w-[220px]">Technical Requirements</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right w-[130px]">Unit Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right w-[110px]">Delivery Days</TableHead>
                  <TableHead className="w-[160px]">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.prItemId ?? index}>
                    <TableCell className="font-medium">{item.label || "—"}</TableCell>
                    <TableCell className="text-xs whitespace-pre-line">
                      {item.technicalRequirements || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitRate || ""}
                        onChange={(e) => updateItem(index, "unitRate", Number(e.target.value))}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.amount > 0
                        ? `₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.deliveryDays || ""}
                        onChange={(e) => updateItem(index, "deliveryDays", Number(e.target.value))}
                        className="text-right"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateItem(index, "remarks", e.target.value)}
                        placeholder="—"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
            <span className="text-sm text-muted-foreground">Material Value</span>
            <span className="text-base font-semibold">
              ₹{materialTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <Badge variant="outline" className="ml-2">
              Charges and GST are added on save
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/purchase/rfq/${id}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save Quotation"}
        </Button>
      </div>
    </div>
  );
}
