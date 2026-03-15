"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Ruler,
  Palette,
  ClipboardCheck,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { use } from "react";
import { toast } from "sonner";

interface InspectionOfferDetail {
  id: string;
  offerNo: string;
  offerDate: string;
  poNumber: string | null;
  projectName: string | null;
  inspectionLocation: string | null;
  proposedInspectionDate: string | null;
  quantityReady: string | null;
  remarks: string | null;
  status: string;
  createdAt: string;
  customer: { name: string; city: string | null; state: string | null };
  tpiAgency: { name: string; contactPerson: string | null; phone: string | null; email: string | null } | null;
  clientPurchaseOrder: { cpoNo: string; clientPoNumber: string } | null;
  salesOrder: { soNo: string } | null;
  createdBy: { name: string } | null;
  items: {
    id: string;
    sNo: number;
    product: string | null;
    material: string | null;
    sizeLabel: string | null;
    heatNo: string | null;
    specification: string | null;
    quantity: string | null;
    quantityReady: string | null;
    uom: string | null;
    colourCodeRequired: boolean;
    colourCode: string | null;
    remark: string | null;
  }[];
}

export default function InspectionOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [offer, setOffer] = useState<InspectionOfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      const res = await fetch(`/api/quality/inspection-offers/${id}`);
      if (res.ok) setOffer(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (type: string, label: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/quality/inspection-offers/${id}/pdf?type=${type}`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label}-${offer?.offerNo?.replace(/\//g, "-") || "doc"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${label} downloaded`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <PageLoading />;
  if (!offer) return <div className="text-center py-12 text-muted-foreground">Not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={offer.offerNo}
        description="Inspection Offer Letter"
        badge={offer.status}
        badgeVariant={offer.status === "DRAFT" ? "secondary" : "default"}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Document Generation Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5"
              onClick={() => downloadPdf("offer", "Inspection-Offer")}
              disabled={downloading === "offer"}
            >
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium">
                {downloading === "offer" ? "Generating..." : "Inspection Offer Letter"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5"
              onClick={() => downloadPdf("tally", "Length-Tally")}
              disabled={downloading === "tally"}
            >
              <Ruler className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium">
                {downloading === "tally" ? "Generating..." : "Length Tally List"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5"
              onClick={() => downloadPdf("colour", "Colour-Code")}
              disabled={downloading === "colour"}
            >
              <Palette className="w-5 h-5 text-orange-500" />
              <span className="text-xs font-medium">
                {downloading === "colour" ? "Generating..." : "Colour Code Compliance"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5"
              onClick={() => downloadPdf("criteria", "Inspection-Criteria")}
              disabled={downloading === "criteria"}
            >
              <ClipboardCheck className="w-5 h-5 text-violet-500" />
              <span className="text-xs font-medium">
                {downloading === "criteria" ? "Generating..." : "Inspection Criteria Checklist"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Client" value={offer.customer.name} highlight />
            <DetailRow label="PO Number" value={offer.poNumber} />
            <DetailRow label="Project" value={offer.projectName} />
            <DetailRow
              label="Proposed Date"
              value={offer.proposedInspectionDate ? format(new Date(offer.proposedInspectionDate), "dd/MM/yyyy") : null}
              highlight
            />
            <DetailRow label="Location" value={offer.inspectionLocation} />
            <DetailRow label="Quantity Ready" value={offer.quantityReady} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TPI & References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="TPI Agency" value={offer.tpiAgency?.name} highlight />
            {offer.tpiAgency?.contactPerson && <DetailRow label="Contact" value={offer.tpiAgency.contactPerson} />}
            {offer.tpiAgency?.phone && <DetailRow label="Phone" value={offer.tpiAgency.phone} />}
            {offer.tpiAgency?.email && <DetailRow label="Email" value={offer.tpiAgency.email} />}
            <Separator />
            <DetailRow label="Created By" value={offer.createdBy?.name} />
            <DetailRow label="Created On" value={format(new Date(offer.createdAt), "dd/MM/yyyy HH:mm")} />
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">S/N</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Heat No.</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Qty Ready</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Colour Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offer.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="font-medium">{item.product || "-"}</TableCell>
                    <TableCell>{item.material || "-"}</TableCell>
                    <TableCell>{item.sizeLabel || "-"}</TableCell>
                    <TableCell className="font-mono">{item.heatNo || "-"}</TableCell>
                    <TableCell>{item.specification || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{item.quantityReady || "-"}</TableCell>
                    <TableCell>{item.uom || "Mtr"}</TableCell>
                    <TableCell>
                      {item.colourCodeRequired ? (
                        <Badge variant="default">{item.colourCode || "Required"}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {offer.remarks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? "font-semibold text-primary" : "text-foreground"}`}>{value || "-"}</span>
    </div>
  );
}
