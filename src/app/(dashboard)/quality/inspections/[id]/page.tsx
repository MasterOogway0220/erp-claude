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
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

const inspectionResultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  HOLD: "bg-yellow-500",
};

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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!inspection) return null;

  const stock = inspection.inventoryStock;
  const grnItem = inspection.grnItem;
  const grn = grnItem?.grn;

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
