"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PageLoading } from "@/components/shared/page-loading";
import {
  ArrowLeft,
  Send,
  FileText,
  BarChart3,
  ClipboardEdit,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_RESPONDED: "bg-yellow-500",
  ALL_RESPONDED: "bg-green-500",
  CLOSED: "bg-purple-500",
};

interface RFQVendor {
  id: string;
  vendor: {
    id: string;
    name: string;
    city?: string;
    email?: string;
  };
  sentDate?: string;
  responseStatus: string;
  quotation?: any;
}

interface QuotationItem {
  prItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitRate: number;
  amount: number;
  deliveryDays: number;
  remarks: string;
}

export default function RFQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Quotation dialog state
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [quotationRef, setQuotationRef] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [priceBasis, setPriceBasis] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [freight, setFreight] = useState("0");
  const [testingCharges, setTestingCharges] = useState("0");
  const [tpiCharges, setTpiCharges] = useState("0");
  const [packingForwarding, setPackingForwarding] = useState("0");
  const [gstRate, setGstRate] = useState("18");
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);
  const [savingQuote, setSavingQuote] = useState(false);

  useEffect(() => {
    if (id) fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/purchase/rfq/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfq(data.rfq || data);
      } else {
        toast.error("Failed to load RFQ");
      }
    } catch (error) {
      toast.error("Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToVendors = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/purchase/rfq/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (response.ok) {
        toast.success("RFQ sent to vendors");
        fetchRFQ();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateCS = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/purchase/comparative-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: id }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Comparative Statement generated");
        router.push(
          `/purchase/comparative-statement/${data.comparativeStatement?.id || data.id || ""}`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate CS");
      }
    } catch (error) {
      toast.error("Failed to generate Comparative Statement");
    } finally {
      setUpdating(false);
    }
  };

  const openQuoteDialog = (vendorId?: string) => {
    const prItems = rfq?.purchaseRequisition?.items || rfq?.items || [];
    setQuoteItems(
      prItems.map((item: any) => ({
        prItemId: item.id,
        itemName: item.itemName || item.name || "",
        quantity: item.quantity,
        unit: item.unit,
        unitRate: 0,
        amount: 0,
        deliveryDays: 0,
        remarks: "",
      }))
    );
    setSelectedVendorId(vendorId || "");
    setQuotationRef("");
    setQuotationDate("");
    setValidUntil("");
    setPriceBasis("");
    setDeliveryDays("");
    setPaymentTerms("");
    setFreight("0");
    setTestingCharges("0");
    setTpiCharges("0");
    setPackingForwarding("0");
    setGstRate("18");
    setShowQuoteDialog(true);
  };

  const updateQuoteItem = (
    index: number,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    setQuoteItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "unitRate") {
        updated[index].amount =
          Number(value) * updated[index].quantity;
      }
      return updated;
    });
  };

  const handleSaveQuotation = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!quotationDate) {
      toast.error("Please enter quotation date");
      return;
    }

    setSavingQuote(true);
    try {
      const response = await fetch(`/api/purchase/rfq/${id}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
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
          items: quoteItems,
        }),
      });

      if (response.ok) {
        toast.success("Quotation saved successfully");
        setShowQuoteDialog(false);
        fetchRFQ();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save quotation");
      }
    } catch (error) {
      toast.error("Failed to save quotation");
    } finally {
      setSavingQuote(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!rfq) {
    return (
      <div className="space-y-6">
        <PageHeader title="RFQ Not Found" description="The requested RFQ could not be found." />
        <Button variant="outline" onClick={() => router.push("/purchase/rfq")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFQs
        </Button>
      </div>
    );
  }

  const prItems = rfq.purchaseRequisition?.items || rfq.items || [];
  const rfqVendors: RFQVendor[] = rfq.vendors || rfq.rfqVendors || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`RFQ: ${rfq.rfqNo || "—"}`}
        description="Request for Quotation details"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/purchase/rfq")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {rfq.status === "DRAFT" && (
            <Button onClick={handleSendToVendors} disabled={updating}>
              <Send className="w-4 h-4 mr-2" />
              Send to Vendors
            </Button>
          )}
          {(rfq.status === "ALL_RESPONDED" ||
            rfq.status === "PARTIALLY_RESPONDED" ||
            rfq.status === "SENT") && (
            <Button onClick={handleGenerateCS} disabled={updating}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Comparative Statement
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RFQ Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">RFQ Number</p>
              <p className="font-mono font-medium">{rfq.rfqNo || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>
                {rfq.rfqDate
                  ? format(new Date(rfq.rfqDate), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[rfq.status] || "bg-gray-500"}>
                {rfq.status?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PR Reference</p>
              <p className="font-mono">
                {rfq.purchaseRequisition?.prNo || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Submission Deadline
              </p>
              <p>
                {rfq.submissionDeadline
                  ? format(new Date(rfq.submissionDeadline), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            {rfq.remarks && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p>{rfq.remarks}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PR Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PR Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  prItems.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.itemName || item.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.specification || item.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Responses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Vendor Response Status</CardTitle>
            {rfq.status !== "DRAFT" && (
              <Button size="sm" onClick={() => openQuoteDialog()}>
                <ClipboardEdit className="w-4 h-4 mr-2" />
                Enter Quotation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Response Status</TableHead>
                  <TableHead>Quote Received</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqVendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      No vendors assigned
                    </TableCell>
                  </TableRow>
                ) : (
                  rfqVendors.map((rv) => (
                    <TableRow key={rv.id}>
                      <TableCell className="font-medium">
                        {rv.vendor?.name || "—"}
                      </TableCell>
                      <TableCell>{rv.vendor?.city || "—"}</TableCell>
                      <TableCell>
                        {rv.sentDate
                          ? format(new Date(rv.sentDate), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rv.responseStatus === "RESPONDED"
                              ? "bg-green-500"
                              : rv.responseStatus === "PENDING"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                          }
                        >
                          {rv.responseStatus?.replace(/_/g, " ") || "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rv.quotation ? (
                          <Badge className="bg-green-500">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openQuoteDialog(rv.vendor?.id)}
                          disabled={rfq.status === "DRAFT"}
                        >
                          <ClipboardEdit className="w-4 h-4 mr-1" />
                          Enter Quote
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enter Quotation Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Vendor Quotation</DialogTitle>
            <DialogDescription>
              Record the quotation received from a vendor for this RFQ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Vendor Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vendor</Label>
                <Select
                  value={selectedVendorId}
                  onValueChange={setSelectedVendorId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rfqVendors.map((rv) => (
                      <SelectItem key={rv.vendor?.id} value={rv.vendor?.id}>
                        {rv.vendor?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quotation Reference</Label>
                <Input
                  value={quotationRef}
                  onChange={(e) => setQuotationRef(e.target.value)}
                  placeholder="Vendor's quote ref no."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Quotation Date</Label>
                <Input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Price Basis</Label>
                <Select value={priceBasis} onValueChange={setPriceBasis}>
                  <SelectTrigger className="mt-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Delivery Days</Label>
                <Input
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="e.g. 30"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 30 days from invoice"
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Commercial Terms */}
            <div>
              <h4 className="font-medium mb-3">Commercial Terms</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label>Freight</Label>
                  <Input
                    type="number"
                    value={freight}
                    onChange={(e) => setFreight(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Testing Charges</Label>
                  <Input
                    type="number"
                    value={testingCharges}
                    onChange={(e) => setTestingCharges(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>TPI Charges</Label>
                  <Input
                    type="number"
                    value={tpiCharges}
                    onChange={(e) => setTpiCharges(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Packing & Forwarding</Label>
                  <Input
                    type="number"
                    value={packingForwarding}
                    onChange={(e) => setPackingForwarding(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>GST Rate %</Label>
                  <Input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h4 className="font-medium mb-3">Item-wise Pricing</h4>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">
                        Delivery Days
                      </TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium min-w-[150px]">
                          {item.itemName}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitRate || ""}
                            onChange={(e) =>
                              updateQuoteItem(
                                index,
                                "unitRate",
                                Number(e.target.value)
                              )
                            }
                            className="w-28 text-right"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.amount > 0
                            ? `₹${item.amount.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.deliveryDays || ""}
                            onChange={(e) =>
                              updateQuoteItem(
                                index,
                                "deliveryDays",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.remarks}
                            onChange={(e) =>
                              updateQuoteItem(index, "remarks", e.target.value)
                            }
                            className="w-32"
                            placeholder="—"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuoteDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveQuotation} disabled={savingQuote}>
              {savingQuote ? "Saving..." : "Save Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
