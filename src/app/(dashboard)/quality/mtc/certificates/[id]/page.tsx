"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Wand2,
  Save,
  Printer,
  CheckCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  DRAFT: { variant: "secondary" },
  FINALIZED: { variant: "default", className: "bg-green-600" },
  REVISED: { variant: "default", className: "bg-yellow-500" },
  CANCELLED: { variant: "destructive" },
};

function isInRange(
  value: number | null,
  min: number | null,
  max: number | null
): boolean | null {
  if (value === null || value === undefined) return null;
  if (min !== null && min !== undefined && value < min) return false;
  if (max !== null && max !== undefined && value > max) return false;
  return true;
}

function resultCellClass(inRange: boolean | null): string {
  if (inRange === null) return "";
  return inRange
    ? "text-green-700 bg-green-50"
    : "text-red-700 bg-red-50 font-semibold";
}

export default function MTCCertificateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);

  const isDraft = cert?.status === "DRAFT" || cert?.status === "REVISED";

  const fetchCertificate = useCallback(async () => {
    try {
      const res = await fetch(`/api/mtc/certificates/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCert(data.certificate || data);
    } catch {
      toast.error("Failed to load MTC certificate");
      router.push("/quality/mtc/certificates");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchCertificate();
  }, [id, fetchCertificate]);

  // --- Helper: unique chemical elements from first item ---
  const getChemicalElements = (): string[] => {
    if (!cert?.items?.[0]?.chemicalResults) return [];
    return cert.items[0].chemicalResults
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((r: any) => r.element);
  };

  // --- Update functions ---
  const updateChemicalResult = (
    itemId: string,
    resultId: string,
    field: string,
    value: string
  ) => {
    setCert((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              chemicalResults: item.chemicalResults.map((r: any) =>
                r.id === resultId ? { ...r, [field]: value } : r
              ),
            }
          : item
      ),
    }));
  };

  const updateMechanicalResult = (
    itemId: string,
    resultId: string,
    field: string,
    value: string
  ) => {
    setCert((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              mechanicalResults: item.mechanicalResults.map((r: any) =>
                r.id === resultId ? { ...r, [field]: value } : r
              ),
            }
          : item
      ),
    }));
  };

  const updateImpactResult = (
    itemId: string,
    resultId: string,
    field: string,
    value: string
  ) => {
    setCert((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              impactResults: item.impactResults.map((r: any) =>
                r.id === resultId ? { ...r, [field]: value } : r
              ),
            }
          : item
      ),
    }));
  };

  // --- Auto-generate results ---
  const handleGenerateResults = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/mtc/certificates/${id}/generate-results`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      const data = await res.json();
      setCert(data.certificate || data);
      toast.success("Results generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate results");
    } finally {
      setGenerating(false);
    }
  };

  // --- Save changes ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/mtc/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: cert.notes,
          remarks: cert.remarks,
          items: cert.items.map((item: any) => ({
            id: item.id,
            chemicalResults: item.chemicalResults?.map((r: any) => ({
              id: r.id,
              heatResult: r.heatResult,
              productResult: r.productResult,
            })),
            mechanicalResults: item.mechanicalResults?.map((r: any) => ({
              id: r.id,
              result: r.result,
            })),
            impactResults: item.impactResults?.map((r: any) => ({
              id: r.id,
              result1: r.result1,
              result2: r.result2,
              result3: r.result3,
              average: r.average,
            })),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Changes saved successfully");
      await fetchCertificate();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // --- Finalize certificate ---
  const handleFinalize = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/mtc/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZED" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to finalize");
      }
      setCert((prev: any) => ({ ...prev, status: "FINALIZED" }));
      toast.success("MTC Certificate finalized");
      setFinalizeOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to finalize");
    } finally {
      setSaving(false);
    }
  };

  // --- Revise certificate ---
  const handleRevise = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/mtc/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVISED" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revise");
      }
      toast.success("Certificate revised - now editable");
      setReviseOpen(false);
      await fetchCertificate();
    } catch (error: any) {
      toast.error(error.message || "Failed to revise");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!cert) return null;

  const sc = statusConfig[cert.status] || statusConfig.DRAFT;
  const elements = getChemicalElements();
  const items: any[] = cert.items || [];

  // Check if any items have mechanical or impact results
  const hasMechanical = items.some(
    (item: any) => item.mechanicalResults && item.mechanicalResults.length > 0
  );
  const hasImpact = items.some(
    (item: any) => item.impactResults && item.impactResults.length > 0
  );
  const hasChemical = items.some(
    (item: any) => item.chemicalResults && item.chemicalResults.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`MTC: ${cert.certificateNo || "Draft"}`}
        badge={cert.status}
        badgeVariant={sc.variant}
        description={`Date: ${cert.certificateDate ? format(new Date(cert.certificateDate), "dd MMM yyyy") : "—"} | Revision: ${cert.revision || 0}`}
      >
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {isDraft && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerateResults}
                disabled={generating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : "Auto Generate Results"}
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={() => setFinalizeOpen(true)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Finalize
              </Button>
            </>
          )}
          {cert.status === "FINALIZED" && (
            <Button variant="outline" onClick={() => setReviseOpen(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Revise
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/mtc/certificates/${id}/pdf?format=html`, "_blank")
            }
          >
            <Printer className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = `/api/mtc/certificates/${id}/pdf`;
              a.download = "";
              a.click();
            }}
          >
            <FileText className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </PageHeader>

      {/* Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Customer</Label>
              <div className="font-medium">
                {cert.customer?.name || cert.customerName || "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">PO No</Label>
              <div className="font-mono font-medium">{cert.poNo || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">PO Date</Label>
              <div>
                {cert.poDate
                  ? format(new Date(cert.poDate), "dd MMM yyyy")
                  : "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Quotation No
              </Label>
              <div className="font-mono">{cert.quotationNo || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Project Name
              </Label>
              <div>{cert.projectName || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Other Reference
              </Label>
              <div>{cert.otherReference || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Certificate No
              </Label>
              <div className="font-mono font-medium">
                {cert.certificateNo || "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Certificate Date
              </Label>
              <div>
                {cert.certificateDate
                  ? format(new Date(cert.certificateDate), "dd MMM yyyy")
                  : "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Material Spec
              </Label>
              <div className="font-mono">
                {cert.materialSpecRef?.materialSpec || cert.materialSpec || "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Additional Requirement
              </Label>
              <div>{cert.additionalRequirement || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Starting Material
              </Label>
              <div>{cert.startingMaterial || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Heat Treatment
              </Label>
              <div>{cert.heatTreatment || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Issued Against
              </Label>
              <div>{cert.issuedAgainst || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Revision</Label>
              <div className="font-mono">{cert.revision ?? 0}</div>
            </div>
            {cert.reviewedBy && (
              <div>
                <Label className="text-muted-foreground text-xs">
                  Reviewed By
                </Label>
                <div>{cert.reviewedBy}</div>
              </div>
            )}
            {cert.witnessedBy && (
              <div>
                <Label className="text-muted-foreground text-xs">
                  Witnessed By
                </Label>
                <div>{cert.witnessedBy}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Item No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Construction</TableHead>
                  <TableHead>Dim. Std</TableHead>
                  <TableHead className="text-center">OD1</TableHead>
                  <TableHead className="text-center">WT1</TableHead>
                  <TableHead className="text-center">OD2</TableHead>
                  <TableHead className="text-center">WT2</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Heat No</TableHead>
                  <TableHead>Raw Material</TableHead>
                  <TableHead>Client Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => (
                  <TableRow key={item.id || idx}>
                    <TableCell className="font-mono font-medium">
                      {item.itemNo || idx + 1}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.constructionType || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.dimensionStandard || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {item.sizeOD1 || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {item.sizeWT1 || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {item.sizeOD2 || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {item.sizeWT2 || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {item.quantity || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.heatNo || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.rawMaterial || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.clientItemCode || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Chemical Composition */}
      {hasChemical && (
        <Card>
          <CardHeader>
            <CardTitle>Chemical Composition</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 sticky left-0 bg-background z-10">
                    ITEM
                  </TableHead>
                  <TableHead className="w-20">HEAT NO.</TableHead>
                  <TableHead className="w-10">%</TableHead>
                  {elements.map((el) => (
                    <TableHead key={el} className="text-center w-16">
                      {el}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  const sortedResults = [...(item.chemicalResults || [])].sort(
                    (a: any, b: any) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                  );

                  return (
                    <tbody key={item.id || idx}>
                      {/* Min row */}
                      <TableRow className="bg-muted/30">
                        <TableCell
                          rowSpan={4}
                          className="font-mono font-medium text-center sticky left-0 bg-muted/30 z-10 border-r"
                        >
                          {item.itemNo || idx + 1}
                        </TableCell>
                        <TableCell
                          rowSpan={4}
                          className="font-mono text-sm border-r"
                        >
                          {item.heatNo || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          min.
                        </TableCell>
                        {sortedResults.map((r: any) => (
                          <TableCell
                            key={`min-${r.id}`}
                            className="text-center text-xs text-muted-foreground"
                          >
                            {r.minValue != null
                              ? Number(r.minValue).toFixed(
                                  r.element === "CEQ" || r.element === "F1"
                                    ? 2
                                    : 3
                                )
                              : "--"}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Max row */}
                      <TableRow className="bg-muted/30">
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          max.
                        </TableCell>
                        {sortedResults.map((r: any) => (
                          <TableCell
                            key={`max-${r.id}`}
                            className="text-center text-xs text-muted-foreground"
                          >
                            {r.maxValue != null
                              ? Number(r.maxValue).toFixed(3)
                              : "--"}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Heat result row */}
                      <TableRow>
                        <TableCell className="text-xs font-medium text-blue-600">
                          H
                        </TableCell>
                        {sortedResults.map((r: any) => {
                          const numVal = r.heatResult
                            ? parseFloat(r.heatResult)
                            : null;
                          const inRange = isInRange(
                            numVal,
                            r.minValue != null ? Number(r.minValue) : null,
                            r.maxValue != null ? Number(r.maxValue) : null
                          );
                          return (
                            <TableCell
                              key={`heat-${r.id}`}
                              className={`text-center p-1 ${resultCellClass(inRange)}`}
                            >
                              {isDraft ? (
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={r.heatResult ?? ""}
                                  onChange={(e) =>
                                    updateChemicalResult(
                                      item.id,
                                      r.id,
                                      "heatResult",
                                      e.target.value
                                    )
                                  }
                                  className="h-7 w-16 text-center text-xs p-1 mx-auto"
                                />
                              ) : (
                                <span className="text-xs font-mono">
                                  {numVal != null ? numVal.toFixed(3) : "--"}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {/* Product result row */}
                      <TableRow className="border-b-2">
                        <TableCell className="text-xs font-medium text-green-600">
                          P
                        </TableCell>
                        {sortedResults.map((r: any) => {
                          const numVal = r.productResult
                            ? parseFloat(r.productResult)
                            : null;
                          const inRange = isInRange(
                            numVal,
                            r.minValue != null ? Number(r.minValue) : null,
                            r.maxValue != null ? Number(r.maxValue) : null
                          );
                          return (
                            <TableCell
                              key={`product-${r.id}`}
                              className={`text-center p-1 ${resultCellClass(inRange)}`}
                            >
                              {isDraft ? (
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={r.productResult ?? ""}
                                  onChange={(e) =>
                                    updateChemicalResult(
                                      item.id,
                                      r.id,
                                      "productResult",
                                      e.target.value
                                    )
                                  }
                                  className="h-7 w-16 text-center text-xs p-1 mx-auto"
                                />
                              ) : (
                                <span className="text-xs font-mono">
                                  {numVal != null ? numVal.toFixed(3) : "--"}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </tbody>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-2">
              F1 = Cu+Ni+Cr+Mo ; CEQ = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mechanical Properties */}
      {hasMechanical && (
        <Card>
          <CardHeader>
            <CardTitle>Mechanical Properties</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ITEM NO</TableHead>
                  <TableHead className="w-[100px]">HEAT NO</TableHead>
                  <TableHead className="w-[40px] text-center">O</TableHead>
                  <TableHead className="w-[40px] text-center">S</TableHead>
                  {(() => {
                    // Collect unique property names from first item with mechanical results
                    const firstItem = items.find(
                      (i: any) =>
                        i.mechanicalResults && i.mechanicalResults.length > 0
                    );
                    if (!firstItem) return null;
                    return [...firstItem.mechanicalResults]
                      .sort(
                        (a: any, b: any) =>
                          (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                      )
                      .map((r: any) => (
                        <TableHead
                          key={r.propertyName}
                          className="text-center min-w-[80px]"
                        >
                          <div className="text-xs">
                            {r.propertyName === "Yield Strength"
                              ? "YS"
                              : r.propertyName === "Tensile Strength"
                                ? "TS"
                                : r.propertyName === "Elongation"
                                  ? "EL"
                                  : r.propertyName === "Reduction Area"
                                    ? "RA"
                                    : r.propertyName === "Hardness"
                                      ? "HB"
                                      : r.propertyName}
                          </div>
                          {r.unit && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              ({r.unit})
                            </div>
                          )}
                        </TableHead>
                      ));
                  })()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  if (
                    !item.mechanicalResults ||
                    item.mechanicalResults.length === 0
                  )
                    return null;
                  const sortedMech = [...item.mechanicalResults].sort(
                    (a: any, b: any) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                  );

                  return (
                    <tbody key={item.id || idx}>
                      {/* Min row */}
                      <TableRow className="bg-muted/30">
                        <TableCell
                          rowSpan={3}
                          className="font-mono font-medium text-center border-r"
                        >
                          {item.itemNo || idx + 1}
                        </TableCell>
                        <TableCell
                          rowSpan={3}
                          className="font-mono text-sm border-r"
                        >
                          {item.heatNo || "—"}
                        </TableCell>
                        <TableCell
                          rowSpan={3}
                          className="text-xs text-center border-r"
                        >
                          {item.orientation || "L"}
                        </TableCell>
                        <TableCell
                          rowSpan={3}
                          className="text-xs text-center border-r"
                        >
                          {item.specimenForm || "S"}
                        </TableCell>
                        {sortedMech.map((r: any) => (
                          <TableCell
                            key={`mech-min-${r.id}`}
                            className="text-center text-xs text-muted-foreground"
                          >
                            <span className="text-[10px] text-muted-foreground">min: </span>
                            {r.minValue != null
                              ? Number(r.minValue).toFixed(1)
                              : "--"}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Max row */}
                      <TableRow className="bg-muted/30">
                        {sortedMech.map((r: any) => (
                          <TableCell
                            key={`mech-max-${r.id}`}
                            className="text-center text-xs text-muted-foreground"
                          >
                            <span className="text-[10px] text-muted-foreground">max: </span>
                            {r.maxValue != null
                              ? Number(r.maxValue).toFixed(1)
                              : "--"}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Result row */}
                      <TableRow className="border-b-2">
                        <TableCell className="text-xs font-medium text-green-600 text-center">
                          R
                        </TableCell>
                        {sortedMech.map((r: any) => {
                          const numVal = r.result
                            ? parseFloat(r.result)
                            : null;
                          const inRange = isInRange(
                            numVal,
                            r.minValue != null ? Number(r.minValue) : null,
                            r.maxValue != null ? Number(r.maxValue) : null
                          );
                          return (
                            <TableCell
                              key={`mech-result-${r.id}`}
                              className={`text-center p-1 ${resultCellClass(inRange)}`}
                            >
                              {isDraft ? (
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={r.result ?? ""}
                                  onChange={(e) =>
                                    updateMechanicalResult(
                                      item.id,
                                      r.id,
                                      "result",
                                      e.target.value
                                    )
                                  }
                                  className="h-7 w-[70px] text-center text-xs p-1 mx-auto"
                                />
                              ) : (
                                <span className="text-xs font-mono">
                                  {numVal != null ? numVal.toFixed(1) : "--"}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </tbody>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Impact Properties */}
      {hasImpact && (
        <Card>
          <CardHeader>
            <CardTitle>Impact Properties</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ITEM</TableHead>
                  <TableHead className="w-[100px]">HEAT NO</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Specimen Size</TableHead>
                  <TableHead className="text-center">Result 1 (J)</TableHead>
                  <TableHead className="text-center">Result 2 (J)</TableHead>
                  <TableHead className="text-center">Result 3 (J)</TableHead>
                  <TableHead className="text-center">Average (J)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  if (!item.impactResults || item.impactResults.length === 0)
                    return null;

                  return item.impactResults.map((r: any) => {
                    const r1 = r.result1 ? parseFloat(r.result1) : null;
                    const r2 = r.result2 ? parseFloat(r.result2) : null;
                    const r3 = r.result3 ? parseFloat(r.result3) : null;
                    const computedAvg =
                      r1 !== null && r2 !== null && r3 !== null
                        ? ((r1 + r2 + r3) / 3).toFixed(1)
                        : null;
                    const displayAvg =
                      r.average != null
                        ? Number(r.average).toFixed(1)
                        : computedAvg ?? "--";

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-medium text-center">
                          {item.itemNo || idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.heatNo || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.testTemperature || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.specimenSize || "—"}
                        </TableCell>
                        <TableCell className="text-center p-1">
                          {isDraft ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={r.result1 ?? ""}
                              onChange={(e) =>
                                updateImpactResult(
                                  item.id,
                                  r.id,
                                  "result1",
                                  e.target.value
                                )
                              }
                              className="h-7 w-[70px] text-center text-xs p-1 mx-auto"
                            />
                          ) : (
                            <span className="text-xs font-mono">
                              {r1 ?? "--"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center p-1">
                          {isDraft ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={r.result2 ?? ""}
                              onChange={(e) =>
                                updateImpactResult(
                                  item.id,
                                  r.id,
                                  "result2",
                                  e.target.value
                                )
                              }
                              className="h-7 w-[70px] text-center text-xs p-1 mx-auto"
                            />
                          ) : (
                            <span className="text-xs font-mono">
                              {r2 ?? "--"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center p-1">
                          {isDraft ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={r.result3 ?? ""}
                              onChange={(e) =>
                                updateImpactResult(
                                  item.id,
                                  r.id,
                                  "result3",
                                  e.target.value
                                )
                              }
                              className="h-7 w-[70px] text-center text-xs p-1 mx-auto"
                            />
                          ) : (
                            <span className="text-xs font-mono">
                              {r3 ?? "--"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono font-medium">
                            {displayAvg}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes & Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {isDraft ? (
              <Textarea
                value={cert.notes || ""}
                onChange={(e) =>
                  setCert((prev: any) => ({ ...prev, notes: e.target.value }))
                }
                rows={4}
                placeholder="Notes for the certificate..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {cert.notes || "No notes"}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            {isDraft ? (
              <Textarea
                value={cert.remarks || ""}
                onChange={(e) =>
                  setCert((prev: any) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Remarks..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {cert.remarks || "No remarks"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              <strong>O</strong> - Orientation
            </span>
            <span>
              <strong>S</strong> - Strip
            </span>
            <span>
              <strong>H</strong> - Heat
            </span>
            <span>
              <strong>R</strong> - Round
            </span>
            <span>
              <strong>RA</strong> - Reduction Area
            </span>
            <span>
              <strong>P</strong> - Product
            </span>
            <span>
              <strong>W</strong> - Weld
            </span>
            <span>
              <strong>N</strong> - Normalized
            </span>
            <span>
              <strong>L</strong> - Longitudinal
            </span>
            <span>
              <strong>T</strong> - Transverse
            </span>
            <span>
              <strong>YS</strong> - Yield Strength
            </span>
            <span>
              <strong>TS</strong> - Tensile Strength
            </span>
            <span>
              <strong>EL</strong> - Elongation
            </span>
            <span>
              <strong>HB</strong> - Hardness (Brinell)
            </span>
            <span>
              <strong>CEQ</strong> - Carbon Equivalent
            </span>
            <span>
              <strong>F1</strong> - Cu+Ni+Cr+Mo
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Finalize Dialog */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize MTC Certificate</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize this certificate? Ensure all
              results have been entered and verified. This action will lock the
              certificate for editing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={saving}>
              {saving ? "Finalizing..." : "Finalize Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revise Dialog */}
      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revise MTC Certificate</DialogTitle>
            <DialogDescription>
              This will create a new revision of the certificate, incrementing
              the revision number. The certificate will be unlocked for editing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRevise} disabled={saving}>
              {saving ? "Revising..." : "Create Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
