"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

const ncrStatusColors: Record<string, string> = {
  OPEN: "bg-red-500",
  UNDER_INVESTIGATION: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

const dispositionLabels: Record<string, string> = {
  RETURN_TO_VENDOR: "Return to Vendor",
  REWORK: "Rework",
  SCRAP: "Scrap",
  USE_AS_IS: "Use As Is",
};

export default function NCRDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [ncr, setNcr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capaData, setCAPAData] = useState({
    rootCause: "",
    correctiveAction: "",
    preventiveAction: "",
    disposition: "",
  });

  useEffect(() => {
    if (params.id) fetchNCR(params.id as string);
  }, [params.id]);

  const fetchNCR = async (id: string) => {
    try {
      const response = await fetch(`/api/quality/ncr/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setNcr(data.ncr);
      setCAPAData({
        rootCause: data.ncr.rootCause || "",
        correctiveAction: data.ncr.correctiveAction || "",
        preventiveAction: data.ncr.preventiveAction || "",
        disposition: data.ncr.disposition || "",
      });
    } catch (error) {
      toast.error("Failed to load NCR");
      router.push("/quality");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToInvestigation = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/quality/ncr/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNDER_INVESTIGATION" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update NCR");
      }

      toast.success("NCR moved to investigation");
      setInvestigateDialogOpen(false);
      fetchNCR(params.id as string);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseNCR = async () => {
    if (!capaData.rootCause.trim()) {
      toast.error("Please provide a root cause");
      return;
    }
    if (!capaData.correctiveAction.trim()) {
      toast.error("Please provide a corrective action");
      return;
    }
    if (!capaData.disposition) {
      toast.error("Please select a disposition");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/quality/ncr/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
          rootCause: capaData.rootCause,
          correctiveAction: capaData.correctiveAction,
          preventiveAction: capaData.preventiveAction,
          disposition: capaData.disposition,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close NCR");
      }

      toast.success("NCR closed successfully");
      setCloseDialogOpen(false);
      fetchNCR(params.id as string);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!ncr) return null;

  const stock = ncr.inventoryStock;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`NCR: ${ncr.ncrNo}`}
        description={`Raised on ${format(new Date(ncr.ncrDate), "dd MMM yyyy")}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {ncr.status === "OPEN" && (
            <Dialog open={investigateDialogOpen} onOpenChange={setInvestigateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Move to Investigation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Move to Investigation</DialogTitle>
                  <DialogDescription>
                    Confirm that this NCR is now under investigation.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setInvestigateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleMoveToInvestigation} disabled={submitting}>
                    {submitting ? "Updating..." : "Confirm"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {(ncr.status === "OPEN" || ncr.status === "UNDER_INVESTIGATION") && (
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Close NCR
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Close NCR - CAPA Details</DialogTitle>
                  <DialogDescription>
                    Provide root cause analysis, corrective/preventive actions, and disposition to close this NCR.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Root Cause *</Label>
                    <Textarea
                      value={capaData.rootCause}
                      onChange={(e) => setCAPAData({ ...capaData, rootCause: e.target.value })}
                      rows={3}
                      placeholder="Describe the root cause of the non-conformance..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Corrective Action *</Label>
                    <Textarea
                      value={capaData.correctiveAction}
                      onChange={(e) => setCAPAData({ ...capaData, correctiveAction: e.target.value })}
                      rows={3}
                      placeholder="Describe the corrective action taken..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preventive Action</Label>
                    <Textarea
                      value={capaData.preventiveAction}
                      onChange={(e) => setCAPAData({ ...capaData, preventiveAction: e.target.value })}
                      rows={3}
                      placeholder="Describe preventive measures to avoid recurrence..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Disposition *</Label>
                    <Select
                      value={capaData.disposition}
                      onValueChange={(value) => setCAPAData({ ...capaData, disposition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select disposition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETURN_TO_VENDOR">Return to Vendor</SelectItem>
                        <SelectItem value="REWORK">Rework</SelectItem>
                        <SelectItem value="SCRAP">Scrap</SelectItem>
                        <SelectItem value="USE_AS_IS">Use As Is</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCloseNCR} disabled={submitting}>
                      {submitting ? "Closing..." : "Close NCR"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      {/* Workflow Status Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${ncr.status === "OPEN" ? "bg-red-100 text-red-800 font-medium" : "text-muted-foreground"}`}>
              <AlertCircle className="w-4 h-4" />
              Open
            </div>
            <div className="w-8 h-0.5 bg-muted-foreground/30" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${ncr.status === "UNDER_INVESTIGATION" ? "bg-yellow-100 text-yellow-800 font-medium" : "text-muted-foreground"}`}>
              <Search className="w-4 h-4" />
              Under Investigation
            </div>
            <div className="w-8 h-0.5 bg-muted-foreground/30" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${ncr.status === "CLOSED" ? "bg-green-100 text-green-800 font-medium" : "text-muted-foreground"}`}>
              <CheckCircle className="w-4 h-4" />
              Closed
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>NCR Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">NCR Number</div>
                <div className="font-mono font-medium">{ncr.ncrNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">NCR Date</div>
                <div>{format(new Date(ncr.ncrDate), "dd MMM yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge className={ncrStatusColors[ncr.status] || "bg-gray-500"}>
                  {ncr.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div>{ncr.nonConformanceType?.replace(/_/g, " ") || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Heat No.</div>
                <div className="font-mono">{ncr.heatNo || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vendor</div>
                <div>{ncr.vendor?.name || "—"}</div>
              </div>
            </div>

            {ncr.purchaseOrder && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Purchase Order</div>
                    <Link
                      href={`/purchase/orders/${ncr.purchaseOrder.id}`}
                      className="font-mono text-blue-600 hover:underline"
                    >
                      {ncr.purchaseOrder.poNo}
                    </Link>
                  </div>
                  {stock && (
                    <div>
                      <div className="text-sm text-muted-foreground">Stock Item</div>
                      <Link
                        href={`/inventory/stock/${stock.id}`}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {stock.heatNo || stock.id}
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{ncr.description || "—"}</div>
            </div>

            {ncr.closedDate && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Closed Date</div>
                    <div>{format(new Date(ncr.closedDate), "dd MMM yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Closed By</div>
                    <div>{ncr.closedBy?.name || "—"}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disposition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ncr.disposition ? (
              <div>
                <div className="text-sm text-muted-foreground">Decision</div>
                <Badge variant="outline" className="mt-1 text-sm">
                  {dispositionLabels[ncr.disposition] || ncr.disposition}
                </Badge>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Disposition will be set when NCR is closed.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CAPA Section */}
      {(ncr.rootCause || ncr.correctiveAction || ncr.preventiveAction) && (
        <Card>
          <CardHeader>
            <CardTitle>CAPA (Corrective & Preventive Actions)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm text-muted-foreground font-medium">Root Cause</div>
                <div className="text-sm mt-1 whitespace-pre-wrap p-3 rounded-md bg-muted/50">
                  {ncr.rootCause || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground font-medium">Corrective Action</div>
                <div className="text-sm mt-1 whitespace-pre-wrap p-3 rounded-md bg-muted/50">
                  {ncr.correctiveAction || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground font-medium">Preventive Action</div>
                <div className="text-sm mt-1 whitespace-pre-wrap p-3 rounded-md bg-muted/50">
                  {ncr.preventiveAction || "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
