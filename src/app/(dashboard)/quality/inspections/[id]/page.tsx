"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  ExternalLink,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PageLoading } from "@/components/shared/page-loading";

const inspectionResultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  HOLD: "bg-yellow-500",
};

// ---------------------------------------------------------------------------
// Document List Component
// ---------------------------------------------------------------------------

function DocumentList({
  title,
  icon,
  paths,
  isImage,
}: {
  title: string;
  icon: React.ReactNode;
  paths: string[];
  isImage?: boolean;
}) {
  if (!paths || paths.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-medium">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {paths.length}
        </Badge>
      </div>
      {isImage ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {paths.map((path, index) => (
            <a
              key={index}
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group rounded-lg border overflow-hidden aspect-square bg-muted hover:ring-2 hover:ring-primary/50 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={path}
                alt={`Inspection image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {paths.map((filePath, index) => {
            const fileName = filePath.split("/").pop() || `Document ${index + 1}`;
            // Strip timestamp prefix for display
            const displayName = fileName.replace(/^\d+_/, "");
            return (
              <a
                key={index}
                href={filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{displayName}</span>
                <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchInspection(params.id as string);
  }, [params.id]);

  const fetchInspection = async (id: string) => {
    try {
      const response = await fetch(`/api/quality/inspections/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setInspection(data.inspection);
    } catch (error) {
      toast.error("Failed to load inspection");
      router.push("/quality");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }
  if (!inspection) return null;

  const stock = inspection.inventoryStock;
  const grnItem = inspection.grnItem;
  const grn = grnItem?.grn;

  const imagePaths: string[] = Array.isArray(inspection.imagePaths) ? inspection.imagePaths : [];
  const reportPaths: string[] = Array.isArray(inspection.reportPaths) ? inspection.reportPaths : [];
  const tpiSignOffPaths: string[] = Array.isArray(inspection.tpiSignOffPaths) ? inspection.tpiSignOffPaths : [];
  const hasDocuments = imagePaths.length > 0 || reportPaths.length > 0 || tpiSignOffPaths.length > 0 || inspection.reportPath;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Inspection: ${inspection.inspectionNo}`}
        description={`Inspected on ${format(new Date(inspection.inspectionDate), "dd MMM yyyy")}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Overall Result</div>
                <Badge
                  className={`${inspectionResultColors[inspection.overallResult] || "bg-gray-500"} text-lg px-6 py-2 mt-1`}
                >
                  {inspection.overallResult}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {grn && (
                <>
                  <Link
                    href={`/inventory/grn/${grn.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    GRN: {grn.grnNo}
                  </Link>
                  <span className="text-muted-foreground">&rarr;</span>
                </>
              )}
              {stock && (
                <Link
                  href={`/inventory/stock/${stock.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Stock: {stock.heatNo || "N/A"}
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Inspection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Inspection Number</div>
                <div className="font-mono font-medium">{inspection.inspectionNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Inspection Date</div>
                <div>{format(new Date(inspection.inspectionDate), "dd MMM yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Inspector</div>
                <div>{inspection.inspector?.name || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overall Result</div>
                <Badge className={inspectionResultColors[inspection.overallResult] || "bg-gray-500"}>
                  {inspection.overallResult}
                </Badge>
              </div>
              {inspection.tpiAgency && (
                <div>
                  <div className="text-sm text-muted-foreground">TPI Agency</div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-violet-500" />
                    <span>{inspection.tpiAgency.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {inspection.tpiAgency.code}
                    </Badge>
                  </div>
                </div>
              )}
              {inspection.inspectionType && (
                <div>
                  <div className="text-sm text-muted-foreground">Inspection Type</div>
                  <Badge variant="outline">
                    {inspection.inspectionType.replace(/_/g, " ")}
                  </Badge>
                </div>
              )}
            </div>
            {inspection.remarks && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground">Remarks</div>
                  <div className="text-sm mt-1">{inspection.remarks}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Material Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stock ? (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Heat No.</div>
                  <div className="font-mono font-medium">{stock.heatNo || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Product</div>
                  <div>{stock.product || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Specification</div>
                  <div>{stock.specification || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Size</div>
                  <div className="font-mono">{stock.sizeLabel || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div>{Number(stock.quantityMtr).toFixed(3)} Mtr, {stock.pieces} Pcs</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Make</div>
                  <div>{stock.make || "—"}</div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No stock linked</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents & Images Section */}
      {hasDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Inspection Documents & Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inspection Images */}
              <DocumentList
                title="Inspection Images"
                icon={<ImageIcon className="h-5 w-5 text-blue-500" />}
                paths={imagePaths}
                isImage
              />

              {/* Inspection Reports */}
              <DocumentList
                title="Inspection Reports"
                icon={<FileText className="h-5 w-5 text-emerald-500" />}
                paths={reportPaths.length > 0 ? reportPaths : (inspection.reportPath ? [inspection.reportPath] : [])}
              />

              {/* TPI Sign-off Documents */}
              <DocumentList
                title="TPI Sign-off Documents"
                icon={<ShieldCheck className="h-5 w-5 text-violet-500" />}
                paths={tpiSignOffPaths}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Standard Value</TableHead>
                <TableHead>Tolerance</TableHead>
                <TableHead>Result Value</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspection.parameters?.length > 0 ? (
                inspection.parameters.map((param: any, index: number) => (
                  <TableRow key={param.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{param.parameterName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(param.parameterType || "PASS_FAIL").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{param.standardValue || "—"}</TableCell>
                    <TableCell>{param.tolerance || "—"}</TableCell>
                    <TableCell className="font-mono">{param.resultValue || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          param.result === "PASS"
                            ? "bg-green-500"
                            : param.result === "FAIL"
                              ? "bg-red-500"
                              : "bg-gray-500"
                        }
                      >
                        {param.result || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{param.remarks || "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No parameters recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
