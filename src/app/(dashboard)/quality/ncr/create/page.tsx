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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NCR_TYPES = [
  { value: "DIMENSIONAL", label: "Dimensional" },
  { value: "CHEMICAL", label: "Chemical" },
  { value: "MECHANICAL", label: "Mechanical" },
  { value: "SURFACE", label: "Surface" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "OTHER", label: "Other" },
];

export default function CreateNCRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [formData, setFormData] = useState({
    nonConformanceType: "",
    description: "",
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch("/api/inventory/stock");
      if (response.ok) {
        const data = await response.json();
        setStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const handleStockSelect = (stockId: string) => {
    setSelectedStockId(stockId);
    const stock = stocks.find((s) => s.id === stockId);
    setSelectedStock(stock || null);
  };

  const getVendorName = (): string => {
    const grn = selectedStock?.grnItem?.grn;
    return grn?.vendor?.name || "—";
  };

  const getPONo = (): string => {
    const grn = selectedStock?.grnItem?.grn;
    return grn?.purchaseOrder?.poNo || "—";
  };

  const getVendorId = (): string | null => {
    const grn = selectedStock?.grnItem?.grn;
    return grn?.vendorId || grn?.vendor?.id || null;
  };

  const getPOId = (): string | null => {
    const grn = selectedStock?.grnItem?.grn;
    return grn?.poId || grn?.purchaseOrder?.id || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStockId) {
      toast.error("Please select a stock item");
      return;
    }

    if (!formData.nonConformanceType) {
      toast.error("Please select a non-conformance type");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please provide a description of the non-conformance");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/quality/ncr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryStockId: selectedStockId,
          grnItemId: selectedStock?.grnItemId || null,
          heatNo: selectedStock?.heatNo || null,
          vendorId: getVendorId(),
          poId: getPOId(),
          nonConformanceType: formData.nonConformanceType,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create NCR");
      }

      const data = await response.json();
      toast.success(`NCR ${data.ncrNo} created successfully`);
      router.push(`/quality/ncr/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create NCR"
        description="Report a non-conformance against received material"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heat Number (from Stock) *</Label>
                <Select value={selectedStockId} onValueChange={handleStockSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock by heat number" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.heatNo || "N/A"} - {stock.product || ""} {stock.sizeLabel || ""} ({stock.status?.replace(/_/g, " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedStock && (
                <div className="space-y-2">
                  <Label>Material Info</Label>
                  <div className="text-sm text-muted-foreground rounded-md border p-3">
                    <div><span className="font-medium">Heat No:</span> {selectedStock.heatNo || "—"}</div>
                    <div><span className="font-medium">Product:</span> {selectedStock.product || "—"} | {selectedStock.specification || "—"}</div>
                    <div><span className="font-medium">Size:</span> {selectedStock.sizeLabel || "—"}</div>
                  </div>
                </div>
              )}
            </div>

            {selectedStock && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor (Auto-filled)</Label>
                  <Input value={getVendorName()} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Order (Auto-filled)</Label>
                  <Input value={getPONo()} disabled />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Non-Conformance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Non-Conformance Type *</Label>
                <Select
                  value={formData.nonConformanceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, nonConformanceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {NCR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Describe the non-conformance in detail..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create NCR"}
          </Button>
        </div>
      </form>
    </div>
  );
}
