"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  FileText,
  FileCheck,
  ClipboardCheck,
  FlaskConical,
  Ruler,
  Palette,
  Package,
  Receipt,
  ShieldCheck,
  BookOpen,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface SectionConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  always?: boolean; // always included, can't be unchecked
}

const DOSSIER_SECTIONS: SectionConfig[] = [
  {
    key: "cover",
    label: "Cover Page & Table of Contents",
    description: "Dossier cover with dispatch reference, customer info, and document index",
    icon: <BookOpen className="h-5 w-5" />,
    always: true,
  },
  {
    key: "clientPO",
    label: "Client Purchase Order",
    description: "Full client PO details with ordered items, quantities, and pricing",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: "poAcceptance",
    label: "PO Acceptance Document",
    description: "Acceptance confirmation with committed delivery date and department contacts",
    icon: <FileCheck className="h-5 w-5" />,
  },
  {
    key: "mtc",
    label: "MTC Certificates",
    description: "Material Test Certificates for all dispatched heats",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    key: "inspection",
    label: "Inspection Reports",
    description: "Internal inspection results with detailed parameter measurements",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    key: "tpi",
    label: "TPI Certificates",
    description: "Third-Party Inspection agency reports and sign-offs",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    key: "labReports",
    label: "Lab Test Reports",
    description: "Chemical, mechanical, hydro, impact, and IGC lab test results",
    icon: <FlaskConical className="h-5 w-5" />,
  },
  {
    key: "lengthTally",
    label: "Length Tally List",
    description: "Pipe-by-pipe length measurements grouped by heat number",
    icon: <Ruler className="h-5 w-5" />,
  },
  {
    key: "colourCoding",
    label: "Colour Coding Compliance",
    description: "Marking details and QC release status for each item",
    icon: <Palette className="h-5 w-5" />,
  },
  {
    key: "packingList",
    label: "Packing List",
    description: "Complete packing details with quantities, weights, and bundle numbers",
    icon: <Package className="h-5 w-5" />,
  },
  {
    key: "invoice",
    label: "Invoice",
    description: "Tax invoice with line items, GST computation, and totals",
    icon: <Receipt className="h-5 w-5" />,
  },
];

export default function DossierPage() {
  const router = useRouter();
  const params = useParams();
  const dnId = params.id as string;

  const [dn, setDN] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(DOSSIER_SECTIONS.map((s) => s.key))
  );

  useEffect(() => {
    fetchDispatchNote();
  }, [dnId]);

  const fetchDispatchNote = async () => {
    try {
      const response = await fetch("/api/dispatch/dispatch-notes");
      if (response.ok) {
        const data = await response.json();
        const found = (data.dispatchNotes || []).find(
          (d: any) => d.id === dnId
        );
        setDN(found || null);
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    const section = DOSSIER_SECTIONS.find((s) => s.key === key);
    if (section?.always) return;

    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSections(new Set(DOSSIER_SECTIONS.map((s) => s.key)));
  };

  const selectMinimal = () => {
    setSelectedSections(
      new Set(["cover", "packingList", "invoice"])
    );
  };

  const generateDossier = (format: "pdf" | "html") => {
    const sections = Array.from(selectedSections).join(",");
    const url = `/api/dispatch/dispatch-notes/${dnId}/dossier?sections=${sections}&format=${format === "html" ? "html" : "pdf"}`;

    if (format === "html") {
      window.open(url, "_blank");
    } else {
      setGenerating(true);
      // Open PDF in new tab
      window.open(url, "_blank");
      setTimeout(() => setGenerating(false), 2000);
    }

    toast.success("Generating dossier...");
  };

  if (loading) return <PageLoading />;

  if (!dn) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Dispatch Note not found
      </div>
    );
  }

  const selectedCount = selectedSections.size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Dossier"
        description={`Compile final document set for ${dn.dnNo}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* Dispatch Context */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Dispatch Note</div>
              <div className="text-sm font-medium font-mono">{dn.dnNo}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div className="text-sm font-medium">
                {dn.salesOrder?.customer?.name || "---"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sales Order</div>
              <div className="text-sm font-medium font-mono">
                {dn.salesOrder?.soNo || "---"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Packing List</div>
              <div className="text-sm font-medium font-mono">
                {dn.packingList?.plNo || "---"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Select Documents to Include</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCount} of {DOSSIER_SECTIONS.length} sections selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectMinimal}>
                Minimal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {DOSSIER_SECTIONS.map((section, idx) => (
              <div key={section.key}>
                {idx > 0 && <Separator className="my-1" />}
                <div
                  className={`flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSections.has(section.key)
                      ? "bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSection(section.key)}
                >
                  <Checkbox
                    checked={selectedSections.has(section.key)}
                    disabled={section.always}
                    onCheckedChange={() => toggleSection(section.key)}
                    className="mt-0.5"
                  />
                  <div className="text-muted-foreground mt-0.5">
                    {section.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{section.label}</span>
                      {section.always && (
                        <Badge variant="secondary" className="text-[10px]">
                          Always included
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => generateDossier("html")}
          disabled={generating}
        >
          <Printer className="w-4 h-4 mr-2" />
          Preview / Print
        </Button>
        <Button
          onClick={() => generateDossier("pdf")}
          disabled={generating}
        >
          <Download className="w-4 h-4 mr-2" />
          {generating ? "Generating..." : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
