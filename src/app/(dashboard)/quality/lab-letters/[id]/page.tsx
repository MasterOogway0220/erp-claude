"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, FlaskConical, Building2, Package, Eye, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent to Lab", variant: "default" },
  RESULTS_PENDING: { label: "Results Pending", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "default" },
};

export default function LabLetterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchLabLetter();
  }, [id]);

  const fetchLabLetter = async () => {
    try {
      const res = await fetch(`/api/quality/lab-letters/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLetter(data.labLetter);
      } else {
        toast.error("Failed to load lab letter");
        router.push("/quality");
      }
    } catch {
      toast.error("Failed to load lab letter");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/quality/lab-letters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLetter((prev: any) => ({ ...prev, status: newStatus }));
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quality/lab-letters/${id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Lab-Letter-${letter.letterNo.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!letter) return null;

  const testNames: string[] = Array.isArray(letter.testNames) ? letter.testNames : [];
  const statusInfo = STATUS_CONFIG[letter.status] || { label: letter.status, variant: "secondary" as const };

  return (
    <div className="space-y-6">
      <PageHeader
        title={letter.letterNo}
        description="Lab Testing Letter"
      >
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Select
            value={letter.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadPdf} disabled={downloadingPdf}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingPdf ? "Generating..." : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/quality")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* Lab & Letter Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Letter Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Letter No" value={letter.letterNo} mono />
              <InfoField label="Date" value={format(new Date(letter.letterDate), "dd MMM yyyy")} />
              <InfoField label="Generated By" value={letter.generatedBy?.name} />
              <InfoField label="PO Number" value={letter.poNumber} />
              <InfoField label="Client Name" value={letter.clientName} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Lab Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <InfoField label="Lab Name" value={letter.labName} />
              <InfoField label="Lab Address" value={letter.labAddress} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Material Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Product Description" value={letter.productDescription} />
            <InfoField label="Item Code" value={letter.itemCode} mono />
            <InfoField label="Specification / Grade" value={letter.specification} />
            <InfoField label="Size" value={letter.sizeLabel} />
            <InfoField label="Heat Number" value={letter.heatNo} mono />
            <InfoField label="Make / Manufacturer" value={letter.make} />
            <InfoField label="Quantity" value={letter.quantity ? `${letter.quantity} ${letter.unit || ""}` : null} />
          </div>
        </CardContent>
      </Card>

      {/* Tests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tests to be Performed</CardTitle>
        </CardHeader>
        <CardContent>
          {testNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {testNames.map((name: string, i: number) => (
                <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tests specified</p>
          )}
        </CardContent>
      </Card>

      {/* Witness & TPI */}
      {(letter.witnessRequired || letter.tpiAgencyName) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Witness / TPI Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField
                label="Witness Required"
                value={letter.witnessRequired ? "Yes" : "No"}
              />
              {letter.tpiAgencyName && (
                <InfoField label="TPI Agency" value={letter.tpiAgencyName} />
              )}
              {letter.tpiAgency?.contactPerson && (
                <InfoField label="Agency Contact" value={`${letter.tpiAgency.contactPerson}${letter.tpiAgency.phone ? ` (${letter.tpiAgency.phone})` : ""}`} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {letter.remarks && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{letter.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
