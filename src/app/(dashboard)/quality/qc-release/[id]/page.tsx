"use client";

import { useState, useEffect, use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

export default function QCReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [qcRelease, setQcRelease] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQCRelease();
  }, [id]);

  const fetchQCRelease = async () => {
    try {
      const res = await fetch(`/api/quality/qc-release/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQcRelease(data.qcRelease);
      }
    } catch (error) {
      console.error("Failed to fetch QC release:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="QC Release Detail" description="Loading..." />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!qcRelease) {
    return (
      <div className="space-y-6">
        <PageHeader title="QC Release Not Found" description="The requested QC release could not be found" />
      </div>
    );
  }

  const decisionColor = qcRelease.decision === "ACCEPT" ? "bg-green-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`QC Release: ${qcRelease.releaseNo}`}
        description={`Released on ${format(new Date(qcRelease.releaseDate), "dd MMM yyyy")}`}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Release Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Release No.</span>
              <span className="font-mono font-medium">{qcRelease.releaseNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Release Date</span>
              <span>{format(new Date(qcRelease.releaseDate), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Decision</span>
              <Badge className={decisionColor}>{qcRelease.decision}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released By</span>
              <span>{qcRelease.releasedBy?.name || "—"}</span>
            </div>
            {qcRelease.remarks && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarks</span>
                <span>{qcRelease.remarks}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspection & Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inspection No.</span>
              <Link
                href={`/quality/inspections/${qcRelease.inspection?.id}`}
                className="font-mono text-blue-600 hover:underline"
              >
                {qcRelease.inspection?.inspectionNo || "—"}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Heat No.</span>
              <span className="font-mono">{qcRelease.inventoryStock?.heatNo || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span>{qcRelease.inventoryStock?.product || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span>{qcRelease.inventoryStock?.sizeLabel || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Qty (Mtr)</span>
              <span>{Number(qcRelease.inventoryStock?.quantityMtr || 0).toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock Status</span>
              <Badge>{qcRelease.inventoryStock?.status?.replace(/_/g, " ") || "—"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
