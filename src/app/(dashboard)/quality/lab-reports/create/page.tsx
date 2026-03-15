"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "CHEMICAL", label: "Chemical Test Report" },
  { value: "MECHANICAL", label: "Mechanical Test Report" },
  { value: "HYDRO", label: "Hydro Test Certificate" },
  { value: "IMPACT", label: "Impact Test Certificate" },
  { value: "IGC", label: "IGC Test Certificate" },
];

export default function CreateLabReportPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    reportType: "",
    heatNo: "",
    itemCode: "",
    poId: "",
    inventoryStockId: "",
    grnId: "",
    filePath: "",
    fileName: "",
    labName: "",
    testDate: "",
    result: "PENDING",
    remarks: "",
  });

  useEffect(() => {
    fetchStocks();
    fetchPurchaseOrders();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch("/api/inventory/stock?pageSize=500");
      if (response.ok) {
        const data = await response.json();
        setStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch("/api/purchase/orders?pageSize=200");
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.purchaseOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch POs:", error);
    }
  };

  const handleStockSelect = (stockId: string) => {
    if (stockId === "NONE") {
      setFormData({ ...formData, inventoryStockId: "", grnId: "" });
      return;
    }
    const stock = stocks.find((s) => s.id === stockId);
    if (stock) {
      setFormData({
        ...formData,
        inventoryStockId: stockId,
        heatNo: stock.heatNo || formData.heatNo,
        grnId: stock.grnItem?.grn?.id || "",
      });
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

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setFormData({ ...formData, filePath: data.filePath, fileName: file.name });
      toast.success("File uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reportType) {
      toast.error("Please select a report type");
      return;
    }
    if (!formData.heatNo) {
      toast.error("Heat number is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/quality/lab-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create lab report");
      }

      const data = await response.json();
      toast.success(`Lab report ${data.labReport.reportNo} created`);
      router.push("/quality/lab-reports");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique heat numbers from stock for autocomplete
  const uniqueHeatNos = [...new Set(stocks.map((s) => s.heatNo).filter(Boolean))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Lab Report"
        description="Upload a test report and link it to heat number, item code, and PO"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type *</Label>
              <Select
                value={formData.reportType || undefined}
                onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Heat Number *</Label>
              <Input
                value={formData.heatNo}
                onChange={(e) => setFormData({ ...formData, heatNo: e.target.value })}
                placeholder="Enter heat number"
                list="heat-nos"
              />
              <datalist id="heat-nos">
                {uniqueHeatNos.map((hn) => (
                  <option key={hn} value={hn} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Item Code</Label>
              <Input
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                placeholder="Material / item code"
              />
            </div>

            <div className="space-y-2">
              <Label>Testing Laboratory</Label>
              <Input
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                placeholder="Lab name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Date</Label>
                <Input
                  type="date"
                  value={formData.testDate}
                  onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Result</Label>
                <Select
                  value={formData.result}
                  onValueChange={(value) => setFormData({ ...formData, result: value })}
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
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linkages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Purchase Order</Label>
                <Select
                  value={formData.poId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, poId: value === "NONE" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {purchaseOrders.map((po: any) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNo} — {po.vendor?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inventory Stock (by Heat No.)</Label>
                <Select
                  value={formData.inventoryStockId || undefined}
                  onValueChange={handleStockSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {stocks
                      .filter((s) => s.heatNo)
                      .map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.heatNo} — {s.product} {s.sizeLabel} ({s.status})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Report (PDF/Image, max 10MB)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>
                {uploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
                {formData.filePath && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Upload className="w-4 h-4" />
                    <span>{formData.fileName || formData.filePath}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Lab Report"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
