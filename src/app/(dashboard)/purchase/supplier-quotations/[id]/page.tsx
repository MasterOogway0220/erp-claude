"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { SQ_STATUSES, PRICING_UNITS } from "@/lib/constants/supplier-quotations";

interface SQDocument {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: { name: string };
}

interface SQItem {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  additionalSpec: string | null;
  sizeLabel: string | null;
  quantity: number;
  uom: string | null;
  pricingUnit: string;
  unitRate: number;
  amount: number;
}

interface SQCharge {
  id: string;
  chargeType: string;
  label: string;
  amount: number;
  taxApplicable: boolean;
}

interface SupplierQuotation {
  id: string;
  sqNo: string;
  sqDate: string;
  vendorRef: string | null;
  quotationDate: string | null;
  validUntil: string | null;
  currency: string;
  paymentTerms: string | null;
  deliveryDays: number | null;
  priceBasis: string | null;
  remarks: string | null;
  status: string;
  subtotal: number | null;
  totalCharges: number | null;
  grandTotal: number | null;
  vendor: { id: string; name: string; city?: string; contactPerson?: string; email?: string; phone?: string };
  rfq: { id: string; rfqNo: string } | null;
  createdBy: { name: string } | null;
  items: SQItem[];
  charges: SQCharge[];
  documents: SQDocument[];
}

function getStatusColor(status: string) {
  switch (status) {
    case "RECEIVED":
      return "bg-blue-100 text-blue-800";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-800";
    case "COMPARED":
      return "bg-purple-100 text-purple-800";
    case "ACCEPTED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "EXPIRED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPricingUnitLabel(value: string) {
  return PRICING_UNITS.find((p) => p.value === value)?.label || value;
}

function getChargeTypeLabel(value: string) {
  const types: Record<string, string> = {
    FREIGHT: "Freight",
    TESTING: "Testing",
    TPI: "TPI",
    PACKING: "Packing",
    INSURANCE: "Insurance",
    TOOLING: "Tooling",
    DIE: "Die",
    COATING: "Coating",
    MINIMUM_ORDER: "Min. Order",
    CUSTOM: "Custom",
  };
  return types[value] || value;
}

function getDocIcon(fileType: string) {
  switch (fileType) {
    case "PDF":
      return <FileText className="h-4 w-4" />;
    case "IMAGE":
      return <Image className="h-4 w-4" />;
    case "EXCEL":
      return <FileSpreadsheet className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function formatCurrency(val: number | null, currency = "INR") {
  if (val === null || val === undefined) return "-";
  const symbol = currency === "INR" ? "\u20B9" : currency + " ";
  return `${symbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupplierQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sq, setSQ] = useState<SupplierQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSQ = async () => {
    try {
      const res = await fetch(`/api/purchase/supplier-quotations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSQ(data);
      setNewStatus(data.status);
    } catch {
      toast.error("Failed to load supplier quotation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSQ();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/purchase/supplier-quotations/${id}/documents`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      toast.success("Document uploaded");
      await fetchSQ();
      setSelectedDocIndex(0);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(
        `/api/purchase/supplier-quotations/${id}/documents/${docId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Document deleted");
      setSelectedDocIndex(0);
      await fetchSQ();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === sq?.status) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/purchase/supplier-quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Status updated");
      await fetchSQ();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!sq) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Supplier Quotation not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/purchase/supplier-quotations")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Register
        </Button>
      </div>
    );
  }

  const statusLabel =
    SQ_STATUSES.find((s) => s.value === sq.status)?.label || sq.status;
  const documents = sq.documents || [];
  const selectedDoc = documents[selectedDocIndex] || null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={sq.sqNo}
        description={`Supplier Quotation from ${sq.vendor.name}`}
      >
        <Button
          variant="outline"
          onClick={() => router.push("/purchase/supplier-quotations")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Document Viewer */}
        <div className="w-full lg:w-5/12 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.doc,.docx"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Document list / tabs */}
                  {documents.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {documents.map((doc, idx) => (
                        <Button
                          key={doc.id}
                          size="sm"
                          variant={idx === selectedDocIndex ? "default" : "outline"}
                          className="text-xs h-7"
                          onClick={() => setSelectedDocIndex(idx)}
                        >
                          {getDocIcon(doc.fileType)}
                          <span className="ml-1 max-w-[100px] truncate">
                            {doc.fileName}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Selected document viewer */}
                  {selectedDoc && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate flex-1">{selectedDoc.fileName}</span>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <a
                            href={selectedDoc.filePath}
                            download
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md border hover:bg-accent"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDoc(selectedDoc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {selectedDoc.fileType === "PDF" && (
                        <iframe
                          src={selectedDoc.filePath}
                          className="w-full h-[500px] border rounded-md"
                          title={selectedDoc.fileName}
                        />
                      )}

                      {selectedDoc.fileType === "IMAGE" && (
                        <img
                          src={selectedDoc.filePath}
                          alt={selectedDoc.fileName}
                          className="w-full rounded-md border"
                        />
                      )}

                      {selectedDoc.fileType !== "PDF" &&
                        selectedDoc.fileType !== "IMAGE" && (
                          <Card className="bg-muted/50">
                            <CardContent className="py-6 text-center space-y-2">
                              {getDocIcon(selectedDoc.fileType)}
                              <p className="text-sm font-medium">
                                {selectedDoc.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedDoc.fileSize)} &middot;{" "}
                                {selectedDoc.fileType}
                              </p>
                              <a
                                href={selectedDoc.filePath}
                                download
                                className="inline-flex items-center text-xs text-primary hover:underline"
                              >
                                <Download className="mr-1 h-3 w-3" /> Download
                                File
                              </a>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Quote Details */}
        <div className="w-full lg:w-7/12 space-y-4">
          {/* Header + Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{sq.sqNo}</h2>
                  <p className="text-sm text-muted-foreground">
                    {sq.vendor.name}
                    {sq.vendor.city ? `, ${sq.vendor.city}` : ""}
                  </p>
                </div>
                <Badge className={getStatusColor(sq.status)}>{statusLabel}</Badge>
              </div>

              <Separator className="my-4" />

              {/* Status Change */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">
                  Change Status:
                </span>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SQ_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus || newStatus === sq.status}
                >
                  {updatingStatus ? "Updating..." : "Update"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Quotation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Vendor Ref</p>
                  <p className="font-medium">{sq.vendorRef || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Quotation Date</p>
                  <p className="font-medium">
                    {sq.quotationDate
                      ? format(new Date(sq.quotationDate), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valid Until</p>
                  <p className="font-medium">
                    {sq.validUntil
                      ? format(new Date(sq.validUntil), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Currency</p>
                  <p className="font-medium">{sq.currency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payment Terms</p>
                  <p className="font-medium">{sq.paymentTerms || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Delivery Days</p>
                  <p className="font-medium">
                    {sq.deliveryDays !== null ? `${sq.deliveryDays} days` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Price Basis</p>
                  <p className="font-medium">{sq.priceBasis || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">RFQ</p>
                  <p className="font-medium">
                    {sq.rfq ? (
                      <a
                        href={`/purchase/rfq/${sq.rfq.id}`}
                        className="text-primary hover:underline"
                      >
                        {sq.rfq.rfqNo}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created By</p>
                  <p className="font-medium">{sq.createdBy?.name || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Line Items ({sq.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">S.No</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Pricing Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sq.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                          No line items
                        </TableCell>
                      </TableRow>
                    ) : (
                      sq.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.sNo}</TableCell>
                          <TableCell>{item.product || "-"}</TableCell>
                          <TableCell>{item.material || "-"}</TableCell>
                          <TableCell>{item.sizeLabel || "-"}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.uom || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getPricingUnitLabel(item.pricingUnit)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitRate, sq.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.amount, sq.currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Charges Table */}
          {sq.charges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Additional Charges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Charge Type</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Tax Applicable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sq.charges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getChargeTypeLabel(charge.chargeType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{charge.label}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(charge.amount, sq.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={charge.taxApplicable ? "default" : "outline"}
                            className="text-xs"
                          >
                            {charge.taxApplicable ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-full max-w-[300px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(sq.subtotal, sq.currency)}
                  </span>
                </div>
                <div className="flex justify-between w-full max-w-[300px]">
                  <span className="text-muted-foreground">Total Charges</span>
                  <span className="font-medium">
                    {formatCurrency(sq.totalCharges, sq.currency)}
                  </span>
                </div>
                <Separator className="my-1 w-full max-w-[300px]" />
                <div className="flex justify-between w-full max-w-[300px]">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-bold text-base">
                    {formatCurrency(sq.grandTotal, sq.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {sq.remarks && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{sq.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
