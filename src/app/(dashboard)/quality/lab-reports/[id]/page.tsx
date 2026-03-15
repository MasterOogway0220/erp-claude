"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PageLoading } from "@/components/shared/page-loading";

const REPORT_TYPE_LABELS: Record<string, string> = {
  CHEMICAL: "Chemical Test Report",
  MECHANICAL: "Mechanical Test Report",
  HYDRO: "Hydro Test Certificate",
  IMPACT: "Impact Test Certificate",
  IGC: "IGC Test Certificate",
};

const resultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  PENDING: "bg-yellow-500",
};

export default function LabReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editData, setEditData] = useState({
    result: "",
    labName: "",
    testDate: "",
    remarks: "",
    filePath: "",
    fileName: "",
  });

  useEffect(() => {
    if (params.id) fetchReport(params.id as string);
  }, [params.id]);

  const fetchReport = async (id: string) => {
    try {
      const response = await fetch(`/api/quality/lab-reports/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setReport(data.labReport);
      setEditData({
        result: data.labReport.result || "PENDING",
        labName: data.labReport.labName || "",
        testDate: data.labReport.testDate ? data.labReport.testDate.split("T")[0] : "",
        remarks: data.labReport.remarks || "",
        filePath: data.labReport.filePath || "",
        fileName: data.labReport.fileName || "",
      });
    } catch (error) {
      toast.error("Failed to load lab report");
      router.push("/quality/lab-reports");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: uploadData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setEditData({ ...editData, filePath: data.filePath, fileName: file.name });
      toast.success("File uploaded");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/quality/lab-reports/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Lab report updated");
      setEditDialogOpen(false);
      fetchReport(params.id as string);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!report) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lab Report: ${report.reportNo}`}
        description={REPORT_TYPE_LABELS[report.reportType] || report.reportType}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Update Lab Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Result</Label>
                  <Select
                    value={editData.result}
                    onValueChange={(value) => setEditData({ ...editData, result: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PASS">Pass</SelectItem>
                      <SelectItem value="FAIL">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Testing Laboratory</Label>
                  <Input
                    value={editData.labName}
                    onChange={(e) => setEditData({ ...editData, labName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Date</Label>
                  <Input
                    type="date"
                    value={editData.testDate}
                    onChange={(e) => setEditData({ ...editData, testDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload / Replace Report</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                  {editData.filePath && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Upload className="w-4 h-4" />
                      <span>{editData.fileName || editData.filePath}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={editData.remarks}
                    onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdate} disabled={submitting}>
                    {submitting ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Report No.</div>
                <div className="font-mono font-medium">{report.reportNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Report Type</div>
                <div className="font-medium">{REPORT_TYPE_LABELS[report.reportType]}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Result</div>
                <Badge className={`mt-1 ${resultColors[report.result] || "bg-gray-500"}`}>
                  {report.result || "PENDING"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Heat Number</div>
                <div className="font-mono font-medium">{report.heatNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Item Code</div>
                <div>{report.itemCode || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Testing Laboratory</div>
                <div>{report.labName || "—"}</div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Report Date</div>
                <div>{format(new Date(report.reportDate), "dd MMM yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Test Date</div>
                <div>{report.testDate ? format(new Date(report.testDate), "dd MMM yyyy") : "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Uploaded By</div>
                <div>{report.uploadedBy?.name || "—"}</div>
              </div>
            </div>
            {report.remarks && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground">Remarks</div>
                  <div className="text-sm mt-1">{report.remarks}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linkages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Purchase Order</div>
                {report.purchaseOrder ? (
                  <Link
                    href={`/purchase/orders/${report.purchaseOrder.id}`}
                    className="text-blue-600 hover:underline font-mono text-sm"
                  >
                    {report.purchaseOrder.poNo}
                    {report.purchaseOrder.vendor && (
                      <span className="text-muted-foreground ml-1">
                        ({report.purchaseOrder.vendor.name})
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="text-sm">—</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Inventory Stock</div>
                {report.inventoryStock ? (
                  <Link
                    href={`/inventory/stock/${report.inventoryStock.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {report.inventoryStock.product} {report.inventoryStock.sizeLabel} — {report.inventoryStock.heatNo}
                  </Link>
                ) : (
                  <div className="text-sm">—</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">GRN</div>
                {report.grn ? (
                  <Link
                    href={`/inventory/grn/${report.grn.id}`}
                    className="text-blue-600 hover:underline font-mono text-sm"
                  >
                    {report.grn.grnNo}
                  </Link>
                ) : (
                  <div className="text-sm">—</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document</CardTitle>
            </CardHeader>
            <CardContent>
              {report.filePath ? (
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">{report.fileName || "Report Document"}</div>
                    <a
                      href={report.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View / Download
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No document uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
