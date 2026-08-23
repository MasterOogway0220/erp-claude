"use client";

import { useState, useEffect } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CreateMTCPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Keyed by the query string, so the screens reading the unfiltered list
  // share one cache entry and the filtered ones get their own.
  const { data: stockData } = useApiQuery<{ stocks: any[] }>(
    ["inventory-stock", ""],
    "/api/inventory/stock"
  );
  const stocks = stockData?.stocks ?? [];
  const { data: purchaseOrdersData } = useApiQuery<{ purchaseOrders: any[] }>(
    ["purchase-orders", ""],
    "/api/purchase/orders"
  );
  const purchaseOrders = purchaseOrdersData?.purchaseOrders ?? [];
  const { data: grnsData } = useApiQuery<{ grns: any[] }>(
    ["grns"],
    "/api/inventory/grn"
  );
  const grns = grnsData?.grns ?? [];
  const [formData, setFormData] = useState({
    mtcNo: "",
    heatNo: "",
    filePath: "",
    poId: "",
    grnId: "",
    inventoryStockId: "",
    remarks: "",
  });

  useEffect(() => {
  }, []);

  const handleStockSelect = (stockId: string) => {
    setFormData({ ...formData, inventoryStockId: stockId });
    const stock = stocks.find((s) => s.id === stockId);
    if (stock) {
      // Auto-fill heat number from stock
      setFormData((prev) => ({
        ...prev,
        inventoryStockId: stockId,
        heatNo: stock.heatNo || prev.heatNo,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mtcNo.trim()) {
      toast.error("MTC number is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/quality/mtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mtcNo: formData.mtcNo.trim(),
          heatNo: formData.heatNo.trim() || null,
          filePath: formData.filePath.trim() || null,
          poId: formData.poId || null,
          grnId: formData.grnId || null,
          inventoryStockId: formData.inventoryStockId || null,
          remarks: formData.remarks.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create MTC document");
      }

      const data = await response.json();
      toast.success(`MTC ${data.mtcNo} uploaded successfully`);
      router.push("/quality?tab=mtc");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload MTC Document"
        description="Add a Mill Test Certificate to the repository"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>MTC Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MTC Number *</Label>
                <Input
                  value={formData.mtcNo}
                  onChange={(e) =>
                    setFormData({ ...formData, mtcNo: e.target.value })
                  }
                  placeholder="Enter MTC number"
                />
              </div>
              <div className="space-y-2">
                <Label>Heat Number</Label>
                <Input
                  value={formData.heatNo}
                  onChange={(e) =>
                    setFormData({ ...formData, heatNo: e.target.value })
                  }
                  placeholder="Enter heat number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>File Path / Document Reference</Label>
              <Input
                value={formData.filePath}
                onChange={(e) =>
                  setFormData({ ...formData, filePath: e.target.value })
                }
                placeholder="Enter file path or document reference"
              />
              <p className="text-xs text-muted-foreground">
                Enter the path or reference to the MTC document
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Order</Label>
                <Select
                  value={formData.poId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, poId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNo} — {po.vendor?.name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>GRN</Label>
                <Select
                  value={formData.grnId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, grnId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to GRN (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn.id} value={grn.id}>
                        {grn.grnNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inventory Stock</Label>
              <Select
                value={formData.inventoryStockId}
                onValueChange={handleStockSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to stock item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map((stock) => (
                    <SelectItem key={stock.id} value={stock.id}>
                      {stock.heatNo || "N/A"} — {stock.product || ""}{" "}
                      {stock.sizeLabel || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                rows={3}
                placeholder="Optional remarks..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload MTC"}
          </Button>
        </div>
      </form>
    </div>
  );
}
