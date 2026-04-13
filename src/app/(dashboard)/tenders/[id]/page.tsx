"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface TenderItem {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  additionalSpec: string | null;
  sizeLabel: string | null;
  quantity: number;
  uom: string | null;
  estimatedRate: number | null;
  amount: number | null;
  remarks: string | null;
}

interface TenderDocument {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number | null;
  category: string;
  uploadedAt: string;
  uploadedBy: { name: string } | null;
}

interface Tender {
  id: string;
  tenderNo: string;
  tenderDate: string;
  closingDate: string | null;
  openingDate: string | null;
  tenderSource: string | null;
  tenderRef: string | null;
  organization: string | null;
  projectName: string | null;
  location: string | null;
  estimatedValue: number | null;
  currency: string;
  emdRequired: boolean;
  emdAmount: number | null;
  emdType: string | null;
  emdSubmitted: boolean;
  emdReturnDate: string | null;
  status: string;
  remarks: string | null;
  customer: { id: string; name: string; city: string | null } | null;
  createdBy: { name: string } | null;
  items: TenderItem[];
  documents: TenderDocument[];
  createdAt: string;
  updatedAt: string;
  quotations?: Array<{
    id: string;
    quotationNo: string;
    quotationDate: string;
    status: string;
    quotationCategory: string;
  }>;
  salesOrders?: Array<{
    id: string;
    soNo: string;
    soDate: string;
    status: string;
  }>;
}

const STATUS_STEPS = [
  "IDENTIFIED",
  "DOCUMENT_PURCHASED",
  "BID_PREPARATION",
  "SUBMITTED",
  "OPENED",
  "WON",
];

const TERMINAL_STATUSES = ["NO_BID", "LOST"];

const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: "Identified",
  DOCUMENT_PURCHASED: "Doc Purchased",
  BID_PREPARATION: "Bid Prep",
  SUBMITTED: "Submitted",
  OPENED: "Opened",
  WON: "Won",
  LOST: "Lost",
  NO_BID: "No Bid",
};

const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: "bg-blue-500",
  DOCUMENT_PURCHASED: "bg-indigo-500",
  BID_PREPARATION: "bg-purple-500",
  SUBMITTED: "bg-amber-500",
  OPENED: "bg-orange-500",
  WON: "bg-green-500",
  LOST: "bg-red-500",
  NO_BID: "bg-gray-500",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  IDENTIFIED: ["DOCUMENT_PURCHASED", "NO_BID"],
  DOCUMENT_PURCHASED: ["BID_PREPARATION", "NO_BID"],
  BID_PREPARATION: ["SUBMITTED", "NO_BID"],
  SUBMITTED: ["OPENED"],
  OPENED: ["WON", "LOST"],
};

const DOCUMENT_CATEGORIES = [
  "TENDER_DOCUMENT",
  "BOQ",
  "DRAWING",
  "NIT",
  "CORRIGENDUM",
  "BID_SUBMISSION",
  "OTHER",
];

const CATEGORY_LABELS: Record<string, string> = {
  TENDER_DOCUMENT: "Tender Doc",
  BOQ: "BOQ",
  DRAWING: "Drawing",
  NIT: "NIT",
  CORRIGENDUM: "Corrigendum",
  BID_SUBMISSION: "Bid Submission",
  OTHER: "Other",
};

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "PDF":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "EXCEL":
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    case "IMAGE":
      return <Image className="h-4 w-4 text-blue-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

function formatCurrency(value: number | null, currency: string = "INR") {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [quoteTypeDialogOpen, setQuoteTypeDialogOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("TENDER_DOCUMENT");
  const [nextStatus, setNextStatus] = useState<string>("");
  const [advancingStatus, setAdvancingStatus] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTender();
  }, [id]);

  async function fetchTender() {
    try {
      const res = await fetch(`/api/tenders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch tender");
      const data = await res.json();
      setTender(data);
    } catch {
      toast.error("Failed to load tender details");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange() {
    if (!nextStatus || !tender) return;
    setAdvancingStatus(true);
    try {
      const res = await fetch(`/api/tenders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }
      toast.success(`Status updated to ${STATUS_LABELS[nextStatus] || nextStatus}`);
      setNextStatus("");
      fetchTender();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdvancingStatus(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);

      const res = await fetch(`/api/tenders/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      toast.success("Document uploaded successfully");
      fetchTender();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/tenders/${id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      toast.success("Document deleted");
      fetchTender();
    } catch {
      toast.error("Failed to delete document");
    }
  }

  if (loading) return <PageLoading />;

  if (!tender) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">Tender not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/tenders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tenders
        </Button>
      </div>
    );
  }

  const availableTransitions = VALID_TRANSITIONS[tender.status] || [];
  const isTerminal = TERMINAL_STATUSES.includes(tender.status) || tender.status === "WON";
  const currentStepIndex = STATUS_STEPS.indexOf(tender.status);
  const itemsTotal = tender.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={tender.tenderNo}
        description={tender.projectName || "Tender Details"}
      >
        <div className="flex items-center gap-2">
          <Badge className={`${STATUS_COLORS[tender.status] || "bg-gray-500"} text-white`}>
            {STATUS_LABELS[tender.status] || tender.status}
          </Badge>

          {availableTransitions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Advance Status" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleStatusChange}
                disabled={!nextStatus || advancingStatus}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => router.push("/tenders")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
      </PageHeader>

      {/* Status Timeline */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, idx) => {
              const isActive =
                !TERMINAL_STATUSES.includes(tender.status) &&
                (currentStepIndex >= idx || tender.status === step);
              const isCurrent = tender.status === step;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                          : isActive
                          ? "bg-primary/80 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 text-center ${
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        !TERMINAL_STATUSES.includes(tender.status) && currentStepIndex > idx
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {TERMINAL_STATUSES.includes(tender.status) && (
            <div className="mt-3 text-center">
              <Badge
                variant="destructive"
                className={tender.status === "NO_BID" ? "bg-gray-500" : "bg-red-500"}
              >
                {STATUS_LABELS[tender.status]}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {tender.status === "WON" && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setQuoteTypeDialogOpen(true)}>
            Create Quotation
          </Button>
          <Button variant="outline" onClick={() => router.push(`/sales/create?tenderId=${tender.id}`)}>
            Create Sales Order
          </Button>
        </div>
      )}

      <Dialog open={quoteTypeDialogOpen} onOpenChange={setQuoteTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Quotation Type</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              onClick={() => {
                setQuoteTypeDialogOpen(false);
                router.push(`/quotations/create/standard?tenderId=${tender.id}`);
              }}
            >
              Standard Quotation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuoteTypeDialogOpen(false);
                router.push(`/quotations/create/nonstandard?tenderId=${tender.id}`);
              }}
            >
              Non-Standard Quotation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details + EMD */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tender Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Organization</dt>
                <dd className="font-medium">{tender.organization || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium">{tender.tenderSource || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tender Ref</dt>
                <dd className="font-medium">{tender.tenderRef || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Project Name</dt>
                <dd className="font-medium">{tender.projectName || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium">{tender.location || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Closing Date</dt>
                <dd className="font-medium">
                  {tender.closingDate ? format(new Date(tender.closingDate), "dd MMM yyyy") : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Opening Date</dt>
                <dd className="font-medium">
                  {tender.openingDate ? format(new Date(tender.openingDate), "dd MMM yyyy") : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated Value</dt>
                <dd className="font-medium">
                  {formatCurrency(tender.estimatedValue, tender.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium">{tender.currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">
                  {tender.customer ? `${tender.customer.name}${tender.customer.city ? `, ${tender.customer.city}` : ""}` : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created By</dt>
                <dd className="font-medium">{tender.createdBy?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tender Date</dt>
                <dd className="font-medium">
                  {format(new Date(tender.tenderDate), "dd MMM yyyy")}
                </dd>
              </div>
            </dl>
            {tender.remarks && (
              <>
                <Separator className="my-3" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Remarks: </span>
                  <span>{tender.remarks}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* EMD Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EMD Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">EMD Required</dt>
                <dd className="font-medium">
                  <Badge variant={tender.emdRequired ? "default" : "secondary"}>
                    {tender.emdRequired ? "Yes" : "No"}
                  </Badge>
                </dd>
              </div>
              {tender.emdRequired && (
                <>
                  <div>
                    <dt className="text-muted-foreground">EMD Amount</dt>
                    <dd className="font-medium">
                      {formatCurrency(tender.emdAmount, tender.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">EMD Type</dt>
                    <dd className="font-medium">{tender.emdType || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">EMD Submitted</dt>
                    <dd className="font-medium">
                      <Badge variant={tender.emdSubmitted ? "default" : "outline"}>
                        {tender.emdSubmitted ? "Yes" : "No"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">EMD Return Date</dt>
                    <dd className="font-medium">
                      {tender.emdReturnDate
                        ? format(new Date(tender.emdReturnDate), "dd MMM yyyy")
                        : "-"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Line Items ({tender.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tender.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items added to this tender.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Est. Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tender.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell>{item.product || "-"}</TableCell>
                    <TableCell>{item.material || "-"}</TableCell>
                    <TableCell>{item.sizeLabel || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell className="text-right">
                      {item.estimatedRate != null ? item.estimatedRate.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.amount != null ? formatCurrency(item.amount, tender.currency) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium border-t-2">
                  <TableCell colSpan={7} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(itemsTotal, tender.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {((tender.quotations && tender.quotations.length > 0) || (tender.salesOrders && tender.salesOrders.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.quotations && tender.quotations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Quotations</p>
                <div className="space-y-2">
                  {tender.quotations.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/quotations/${q.id}`)}
                    >
                      <span className="font-medium">{q.quotationNo}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{q.quotationCategory === "NON_STANDARD" ? "Non-Std" : "Std"}</span>
                        <span>{q.quotationDate ? new Date(q.quotationDate).toLocaleDateString("en-IN") : "—"}</span>
                        <Badge variant="outline">{q.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tender.salesOrders && tender.salesOrders.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Sales Orders</p>
                <div className="space-y-2">
                  {tender.salesOrders.map((so) => (
                    <div
                      key={so.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/sales/${so.id}`)}
                    >
                      <span className="font-medium">{so.soNo}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{so.soDate ? new Date(so.soDate).toLocaleDateString("en-IN") : "—"}</span>
                        <Badge variant="outline">{so.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documents ({tender.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          {!isTerminal && (
            <div className="flex items-center gap-2 pb-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.webp"
              />
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}

          {/* Documents List */}
          {tender.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No documents uploaded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>File Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tender.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{getFileIcon(doc.fileType)}</TableCell>
                    <TableCell className="font-medium">{doc.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.uploadedBy?.name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
