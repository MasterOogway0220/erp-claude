"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectionParam {
  parameterName: string;
  parameterType: string;
  result: string;
  standardValue: string;
  tolerance: string;
  resultValue: string;
  remarks: string;
}

interface UploadedFile {
  filePath: string;
  fileName: string;
}

interface TPIAgency {
  id: string;
  name: string;
  code: string;
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

// ---------------------------------------------------------------------------
// File Upload Hook
// ---------------------------------------------------------------------------

function useFileUploader() {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`File "${file.name}" exceeds 10MB limit`);
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      return { filePath: result.filePath, fileName: file.name };
    } catch {
      toast.error(`Failed to upload "${file.name}"`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadFile };
}

// ---------------------------------------------------------------------------
// FileUploadSection Component
// ---------------------------------------------------------------------------

function FileUploadSection({
  title,
  description,
  icon,
  accept,
  files,
  onAdd,
  onRemove,
  uploading,
  inputId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
  files: UploadedFile[];
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
  uploading: boolean;
  inputId: string;
}) {
  const isImage = accept.includes("image");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept={accept}
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAdd(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {files.length > 0 && (
        <div className={isImage ? "grid grid-cols-3 gap-2" : "space-y-1.5"}>
          {files.map((file, index) => (
            <div
              key={index}
              className={
                isImage
                  ? "relative group rounded-lg border overflow-hidden aspect-square bg-muted"
                  : "flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              }
            >
              {isImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.filePath}
                    alt={file.fileName}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.fileName}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          No files uploaded yet
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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

  // TPI Agency
  const [agencies, setAgencies] = useState<TPIAgency[]>([]);
  const [tpiAgencyId, setTpiAgencyId] = useState("");

  // File uploads
  const [inspectionImages, setInspectionImages] = useState<UploadedFile[]>([]);
  const [inspectionReports, setInspectionReports] = useState<UploadedFile[]>([]);
  const [tpiSignOffDocs, setTpiSignOffDocs] = useState<UploadedFile[]>([]);
  const { uploading, uploadFile } = useFileUploader();

  useEffect(() => {
    fetchStocks();
    fetchAgencies();
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

  const fetchAgencies = async () => {
    try {
      const res = await fetch("/api/masters/inspection-agencies");
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.agencies || []);
      }
    } catch {
      // Silently fail
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

  // Multi-file upload handlers
  const handleMultiUpload = async (
    fileList: FileList,
    existing: UploadedFile[],
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    for (const file of Array.from(fileList)) {
      const result = await uploadFile(file);
      if (result) {
        setter((prev) => [...prev, result]);
      }
    }
  };

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
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

    // For PASS result, require at least one report
    if (overallResult === "PASS" && inspectionReports.length === 0) {
      toast.error("Inspection report is mandatory for PASS result. Please upload at least one report.");
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
          tpiAgencyId: tpiAgencyId || null,
          reportPath: inspectionReports[0]?.filePath || null,
          imagePaths: inspectionImages.map((f) => f.filePath),
          reportPaths: inspectionReports.map((f) => f.filePath),
          tpiSignOffPaths: tpiSignOffDocs.map((f) => f.filePath),
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
        {/* Card 1: Stock Selection & Overall Result */}
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
                <Select value={selectedStockId || "NONE"} onValueChange={(v) => handleStockSelect(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock to inspect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>Select stock to inspect</SelectItem>
                    {stocks.length === 0 && (
                      <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                        No stocks under inspection
                      </div>
                    )}
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
                <Select value={inspectionType || "NONE"} onValueChange={(v) => setInspectionType(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
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
              <div className="space-y-2">
                <Label>TPI Agency</Label>
                <Select value={tpiAgencyId || "NONE"} onValueChange={(v) => setTpiAgencyId(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select TPI agency (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name} ({agency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tpiAgencyId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setTpiAgencyId("")}
                  >
                    Clear selection
                  </Button>
                )}
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

        {/* Card 2: Document Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              Inspection Documents & Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadSection
                title="Inspection Images"
                description="Photos of material, defects, markings"
                icon={<ImageIcon className="h-5 w-5 text-blue-500" />}
                accept="image/*"
                files={inspectionImages}
                onAdd={(fileList) => handleMultiUpload(fileList, inspectionImages, setInspectionImages)}
                onRemove={(index) => removeFile(index, setInspectionImages)}
                uploading={uploading}
                inputId="upload-images"
              />
              <FileUploadSection
                title="Inspection Reports"
                description="PDF/document reports"
                icon={<FileText className="h-5 w-5 text-emerald-500" />}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                files={inspectionReports}
                onAdd={(fileList) => handleMultiUpload(fileList, inspectionReports, setInspectionReports)}
                onRemove={(index) => removeFile(index, setInspectionReports)}
                uploading={uploading}
                inputId="upload-reports"
              />
              <FileUploadSection
                title="TPI Sign-off Documents"
                description="Third-party inspection approvals"
                icon={<ShieldCheck className="h-5 w-5 text-violet-500" />}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                files={tpiSignOffDocs}
                onAdd={(fileList) => handleMultiUpload(fileList, tpiSignOffDocs, setTpiSignOffDocs)}
                onRemove={(index) => removeFile(index, setTpiSignOffDocs)}
                uploading={uploading}
                inputId="upload-tpi-signoff"
              />
            </div>
            {overallResult === "PASS" && inspectionReports.length === 0 && (
              <div className="mt-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
                Inspection report upload is mandatory for PASS result.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Inspection Parameters */}
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
          <Button type="submit" disabled={loading || uploading}>
            {loading ? "Creating..." : "Create Inspection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
