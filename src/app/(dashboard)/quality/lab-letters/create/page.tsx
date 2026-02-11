"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface TestingItem {
  id: string;
  testName: string;
  applicableFor: string | null;
  isMandatory: boolean;
}

export default function CreateLabLetterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [tests, setTests] = useState<TestingItem[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  useEffect(() => {
    fetchStocks();
    fetchTests();
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

  const fetchTests = async () => {
    try {
      const response = await fetch("/api/masters/testing");
      if (response.ok) {
        const data = await response.json();
        const testItems = data.tests || data.testingMasters || [];
        setTests(testItems);
        // Pre-select mandatory tests
        const mandatoryIds = testItems
          .filter((t: TestingItem) => t.isMandatory)
          .map((t: TestingItem) => t.id);
        setSelectedTestIds(mandatoryIds);
      }
    } catch (error) {
      console.error("Failed to fetch testing masters:", error);
    }
  };

  const handleStockSelect = (stockId: string) => {
    setSelectedStockId(stockId);
    const stock = stocks.find((s) => s.id === stockId);
    setSelectedStock(stock || null);
  };

  const toggleTest = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStockId) {
      toast.error("Please select a stock item");
      return;
    }

    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one test");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/quality/lab-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatNo: selectedStock?.heatNo || null,
          specification: selectedStock?.specification || null,
          sizeLabel: selectedStock?.sizeLabel || null,
          testIds: selectedTestIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create lab letter");
      }

      const data = await response.json();
      toast.success(`Lab Letter ${data.letterNo} created successfully`);
      router.push("/quality");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Lab Letter"
        description="Generate a lab test letter for material testing"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Material Selection</CardTitle>
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
                        {stock.heatNo || "N/A"} - {stock.product || ""} {stock.sizeLabel || ""}
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
                    <div><span className="font-medium">Product:</span> {selectedStock.product || "—"}</div>
                    <div><span className="font-medium">Make:</span> {selectedStock.make || "—"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Specification (Auto-filled)</Label>
                <Input
                  value={selectedStock?.specification || ""}
                  disabled
                  placeholder="Auto-filled from stock"
                />
              </div>
              <div className="space-y-2">
                <Label>Size (Auto-filled)</Label>
                <Input
                  value={selectedStock?.sizeLabel || ""}
                  disabled
                  placeholder="Auto-filled from stock"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tests to be Performed</CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tests.map((test) => (
                  <label
                    key={test.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTestIds.includes(test.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTestIds.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium">{test.testName}</div>
                      {test.applicableFor && (
                        <div className="text-xs text-muted-foreground">
                          {test.applicableFor}
                        </div>
                      )}
                      {test.isMandatory && (
                        <span className="text-xs text-red-600 font-medium">Mandatory</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No testing types configured. Please set up testing masters first.
              </div>
            )}
            {selectedTestIds.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                {selectedTestIds.length} test(s) selected
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Lab Letter"}
          </Button>
        </div>
      </form>
    </div>
  );
}
