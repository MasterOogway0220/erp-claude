"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateQCReleasePage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<any[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [decision, setDecision] = useState("ACCEPT");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const res = await fetch("/api/quality/inspections");
      if (res.ok) {
        const data = await res.json();
        // Filter to PASS inspections only
        const passInspections = (data.inspections || []).filter(
          (i: any) => i.overallResult === "PASS"
        );
        setInspections(passInspections);
      }
    } catch (error) {
      console.error("Failed to fetch inspections:", error);
    }
  };

  const handleSelectInspection = (inspectionId: string) => {
    const insp = inspections.find((i) => i.id === inspectionId);
    setSelectedInspection(insp);
  };

  const handleSubmit = async () => {
    if (!selectedInspection) {
      toast.error("Please select an inspection");
      return;
    }

    const inventoryStockId =
      selectedInspection.inventoryStock?.id || selectedInspection.inventoryStockId;

    if (!inventoryStockId) {
      toast.error("No inventory stock linked to this inspection");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quality/qc-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionId: selectedInspection.id,
          inventoryStockId,
          decision,
          remarks,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create QC release");
        return;
      }

      const data = await res.json();
      toast.success(`QC Release ${data.releaseNo} created`);
      router.push(`/quality/qc-release/${data.id}`);
    } catch (error) {
      toast.error("Failed to create QC release");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create QC Release"
        description="Release stock after quality inspection"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Inspection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Inspection (PASS results only) *</Label>
            <Select
              onValueChange={handleSelectInspection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an inspection" />
              </SelectTrigger>
              <SelectContent>
                {inspections.map((insp) => (
                  <SelectItem key={insp.id} value={insp.id}>
                    {insp.inspectionNo} — Heat: {insp.inventoryStock?.heatNo || insp.grnItem?.heatNo || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedInspection && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Inspection No.</span>
                  <p className="font-mono font-medium">{selectedInspection.inspectionNo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Date</span>
                  <p>{format(new Date(selectedInspection.inspectionDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Result</span>
                  <p><Badge className="bg-green-500">PASS</Badge></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Heat No.</span>
                  <p className="font-mono">{selectedInspection.inventoryStock?.heatNo || selectedInspection.grnItem?.heatNo || "—"}</p>
                </div>
              </div>
              {selectedInspection.inventoryStock && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground">Product</span>
                    <p>{selectedInspection.inventoryStock.product || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Size</span>
                    <p>{selectedInspection.inventoryStock.sizeLabel || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Qty (Mtr)</span>
                    <p>{Number(selectedInspection.inventoryStock.quantityMtr).toFixed(3)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Current Status</span>
                    <p><Badge>{selectedInspection.inventoryStock.status?.replace(/_/g, " ")}</Badge></p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Release Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Decision *</Label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPT">Accept - Release to Stock</SelectItem>
                      <SelectItem value="REJECT">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional remarks..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Creating..." : "Create QC Release"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
