"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface InspectionParam {
  parameterName: string;
  parameterType: string;
  result: string;
  standardValue: string;
  tolerance: string;
  resultValue: string;
  remarks: string;
}

const DEFAULT_PARAMETERS: InspectionParam[] = [
  { parameterName: "Visual Inspection", parameterType: "PASS_FAIL", result: "", standardValue: "No defects", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Outer Diameter", parameterType: "PASS_FAIL", result: "", standardValue: "", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Wall Thickness", parameterType: "PASS_FAIL", result: "", standardValue: "", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Length", parameterType: "PASS_FAIL", result: "", standardValue: "", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Straightness", parameterType: "PASS_FAIL", result: "", standardValue: "", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "End Finish", parameterType: "PASS_FAIL", result: "", standardValue: "", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Surface Finish", parameterType: "PASS_FAIL", result: "", standardValue: "No pitting/corrosion", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Marking Verification", parameterType: "PASS_FAIL", result: "", standardValue: "As per spec", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "MTC Verification", parameterType: "PASS_FAIL", result: "", standardValue: "Matching", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Chemical Composition", parameterType: "PASS_FAIL", result: "", standardValue: "As per MTC", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Mechanical Properties", parameterType: "PASS_FAIL", result: "", standardValue: "As per MTC", tolerance: "", resultValue: "", remarks: "" },
  { parameterName: "Hydrostatic Test", parameterType: "PASS_FAIL", result: "", standardValue: "As per spec", tolerance: "", resultValue: "", remarks: "" },
];

export default function CreateInspectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [inspectionType, setInspectionType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [parameters, setParameters] = useState<InspectionParam[]>(
    DEFAULT_PARAMETERS.map((p) => ({ ...p }))
  );

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch("/api/inventory/stock?status=UNDER_INSPECTION");
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

  const updateParameter = (index: number, field: keyof InspectionParam, value: string) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        parameterName: "",
        parameterType: "PASS_FAIL",
        result: "",
        standardValue: "",
        tolerance: "",
        resultValue: "",
        remarks: "",
      },
    ]);
  };

  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
    }
  };

  const computeOverallResult = (): string => {
    const results = parameters.map((p) => p.result).filter(Boolean);
    if (results.length === 0) return "HOLD";
    if (results.some((r) => r === "FAIL")) return "FAIL";
    if (results.length === parameters.length && results.every((r) => r === "PASS")) return "PASS";
    return "HOLD";
  };

  const overallResult = computeOverallResult();

  const overallResultColors: Record<string, string> = {
    PASS: "bg-green-500",
    FAIL: "bg-red-500",
    HOLD: "bg-yellow-500",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStockId) {
      toast.error("Please select a stock item to inspect");
      return;
    }

    const filledParams = parameters.filter((p) => p.parameterName && p.result);
    if (filledParams.length === 0) {
      toast.error("Please fill in at least one inspection parameter with a result");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryStockId: selectedStockId,
          grnItemId: selectedStock?.grnItemId || null,
          inspectionType: inspectionType || null,
          overallResult,
          remarks,
          parameters: filledParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create inspection");
      }

      const data = await response.json();
      toast.success(`Inspection ${data.inspectionNo} created successfully`);
      router.push(`/quality/inspections/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Inspection"
        description="Record quality inspection for incoming material"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock Selection & Overall Result</CardTitle>
              <Badge className={`${overallResultColors[overallResult]} text-lg px-4 py-1`}>
                {overallResult}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Item (Under Inspection) *</Label>
                <Select value={selectedStockId} onValueChange={handleStockSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock to inspect" />
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
                    <div><span className="font-medium">Product:</span> {selectedStock.product || "—"} | {selectedStock.specification || "—"}</div>
                    <div><span className="font-medium">Size:</span> {selectedStock.sizeLabel || "—"} | <span className="font-medium">Qty:</span> {Number(selectedStock.quantityMtr).toFixed(3)} Mtr, {selectedStock.pieces} Pcs</div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspection Type</Label>
                <Select value={inspectionType} onValueChange={setInspectionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VISUAL">Visual</SelectItem>
                    <SelectItem value="DIMENSIONAL">Dimensional</SelectItem>
                    <SelectItem value="CHEMICAL_ANALYSIS">Chemical Analysis</SelectItem>
                    <SelectItem value="MECHANICAL_TESTING">Mechanical Testing</SelectItem>
                    <SelectItem value="HYDROSTATIC">Hydrostatic</SelectItem>
                    <SelectItem value="PMI">PMI</SelectItem>
                    <SelectItem value="RADIOGRAPHY">Radiography</SelectItem>
                    <SelectItem value="ULTRASONIC">Ultrasonic</SelectItem>
                    <SelectItem value="MAGNETIC_PARTICLE">Magnetic Particle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Optional inspection remarks..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inspection Parameters</CardTitle>
              <Button type="button" variant="outline" onClick={addParameter}>
                <Plus className="w-4 h-4 mr-2" />
                Add Parameter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[180px]">Parameter Name</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-28">Result</TableHead>
                    <TableHead className="w-32">Std. Value</TableHead>
                    <TableHead className="w-28">Tolerance</TableHead>
                    <TableHead className="w-32">Result Value</TableHead>
                    <TableHead className="min-w-[150px]">Remarks</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.map((param, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={param.parameterName}
                          onChange={(e) => updateParameter(index, "parameterName", e.target.value)}
                          placeholder="Parameter name"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={param.parameterType}
                          onValueChange={(value) => updateParameter(index, "parameterType", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PASS_FAIL">Pass/Fail</SelectItem>
                            <SelectItem value="MEASUREMENT">Measurement</SelectItem>
                            <SelectItem value="VISUAL">Visual</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={param.result}
                          onValueChange={(value) => updateParameter(index, "result", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PASS">Pass</SelectItem>
                            <SelectItem value="FAIL">Fail</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={param.standardValue}
                          onChange={(e) => updateParameter(index, "standardValue", e.target.value)}
                          placeholder="Std."
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={param.tolerance}
                          onChange={(e) => updateParameter(index, "tolerance", e.target.value)}
                          placeholder="Tol."
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={param.resultValue}
                          onChange={(e) => updateParameter(index, "resultValue", e.target.value)}
                          placeholder="Actual"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={param.remarks}
                          onChange={(e) => updateParameter(index, "remarks", e.target.value)}
                          placeholder="Remarks"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        {parameters.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParameter(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Inspection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
