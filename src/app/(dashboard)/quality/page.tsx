"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  FileWarning,
  FileText,
  FlaskConical,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

const inspectionResultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  HOLD: "bg-yellow-500",
};

const ncrStatusColors: Record<string, string> = {
  OPEN: "bg-red-500",
  UNDER_INVESTIGATION: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

const verificationStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  VERIFIED: "bg-green-500",
  DISCREPANT: "bg-red-500",
};

export default function QualityPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<any[]>([]);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [mtcs, setMtcs] = useState<any[]>([]);
  const [mtcSearch, setMtcSearch] = useState("");
  const [labLetters, setLabLetters] = useState<any[]>([]);
  const [qcReleases, setQcReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
    fetchNCRs();
    fetchMTCs();
    fetchLabLetters();
    fetchQCReleases();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch("/api/quality/inspections");
      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
      }
    } catch (error) {
      console.error("Failed to fetch inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNCRs = async () => {
    try {
      const response = await fetch("/api/quality/ncr");
      if (response.ok) {
        const data = await response.json();
        setNcrs(data.ncrs || []);
      }
    } catch (error) {
      console.error("Failed to fetch NCRs:", error);
    }
  };

  const fetchMTCs = async (search?: string) => {
    try {
      const url = search ? `/api/quality/mtc?search=${encodeURIComponent(search)}` : "/api/quality/mtc";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMtcs(data.mtcDocuments || []);
      }
    } catch (error) {
      console.error("Failed to fetch MTCs:", error);
    }
  };

  const handleMtcSearch = () => {
    fetchMTCs(mtcSearch);
  };

  const handleMtcVerificationUpdate = async (mtcId: string, verificationStatus: string) => {
    try {
      const response = await fetch(`/api/quality/mtc/${mtcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (response.ok) {
        toast.success(`MTC verification status updated to ${verificationStatus}`);
        fetchMTCs(mtcSearch || undefined);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update verification status");
      }
    } catch (error) {
      toast.error("Failed to update verification status");
    }
  };

  const fetchLabLetters = async () => {
    try {
      const response = await fetch("/api/quality/lab-letters");
      if (response.ok) {
        const data = await response.json();
        setLabLetters(data.labLetters || []);
      }
    } catch (error) {
      console.error("Failed to fetch lab letters:", error);
    }
  };

  const fetchQCReleases = async () => {
    try {
      const response = await fetch("/api/quality/qc-release");
      if (response.ok) {
        const data = await response.json();
        setQcReleases(data.qcReleases || []);
      }
    } catch (error) {
      console.error("Failed to fetch QC releases:", error);
    }
  };

  const inspectionColumns: Column<any>[] = [
    {
      key: "inspectionNo",
      header: "Inspection No.",
      cell: (row) => (
        <Link
          href={`/quality/inspections/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.inspectionNo as string}
        </Link>
      ),
    },
    {
      key: "inspectionDate",
      header: "Date",
      cell: (row) => format(new Date(row.inspectionDate as string), "dd MMM yyyy"),
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => {
        const stock = row.inventoryStock as any;
        return (
          <span className="font-mono text-sm">
            {stock?.heatNo || (row.grnItem as any)?.heatNo || "—"}
          </span>
        );
      },
    },
    {
      key: "overallResult",
      header: "Result",
      cell: (row) => (
        <Badge className={inspectionResultColors[row.overallResult as string] || "bg-gray-500"}>
          {row.overallResult as string}
        </Badge>
      ),
    },
    {
      key: "inspector",
      header: "Inspector",
      cell: (row) => (row.inspector as any)?.name || "—",
    },
  ];

  const ncrColumns: Column<any>[] = [
    {
      key: "ncrNo",
      header: "NCR No.",
      cell: (row) => (
        <Link
          href={`/quality/ncr/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.ncrNo as string}
        </Link>
      ),
    },
    {
      key: "ncrDate",
      header: "Date",
      cell: (row) => format(new Date(row.ncrDate as string), "dd MMM yyyy"),
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "nonConformanceType",
      header: "Type",
      cell: (row) => (row.nonConformanceType as string)?.replace(/_/g, " ") || "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.vendor as any)?.name || "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={ncrStatusColors[row.status as string] || "bg-gray-500"}>
          {(row.status as string).replace(/_/g, " ")}
        </Badge>
      ),
    },
  ];

  const mtcColumns: Column<any>[] = [
    {
      key: "mtcNo",
      header: "MTC No.",
      cell: (row) => <span className="font-mono text-sm">{row.mtcNo as string}</span>,
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "product",
      header: "Product / Size",
      cell: (row) => {
        const stock = row.inventoryStock as any;
        return stock ? `${stock.product || ""} ${stock.sizeLabel || ""}`.trim() || "—" : "—";
      },
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.purchaseOrder as any)?.vendor?.name || "—",
    },
    {
      key: "purchaseOrder",
      header: "PO",
      cell: (row) => {
        const po = row.purchaseOrder as any;
        return po ? <Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline text-sm">{po.poNo}</Link> : "—";
      },
    },
    {
      key: "grn",
      header: "GRN",
      cell: (row) => {
        const grn = row.grn as any;
        return grn ? <Link href={`/inventory/grn/${grn.id}`} className="text-blue-600 hover:underline text-sm">{grn.grnNo}</Link> : "—";
      },
    },
    {
      key: "verificationStatus",
      header: "Verification Status",
      cell: (row) => {
        const status = (row.verificationStatus as string) || "PENDING";
        return (
          <Select
            value={status}
            onValueChange={(value) => handleMtcVerificationUpdate(row.id as string, value)}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <Badge className={`${verificationStatusColors[status] || "bg-gray-500"} text-xs`}>
                {status}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="DISCREPANT">Discrepant</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "uploadDate",
      header: "Upload Date",
      cell: (row) => format(new Date(row.uploadDate as string), "dd MMM yyyy"),
    },
  ];

  const qcReleaseColumns: Column<any>[] = [
    {
      key: "releaseNo",
      header: "Release No.",
      cell: (row) => (
        <Link
          href={`/quality/qc-release/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.releaseNo as string}
        </Link>
      ),
    },
    {
      key: "releaseDate",
      header: "Date",
      cell: (row) => format(new Date(row.releaseDate as string), "dd MMM yyyy"),
    },
    {
      key: "inspection",
      header: "Inspection No.",
      cell: (row) => (row.inspection as any)?.inspectionNo || "—",
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">
          {(row.inventoryStock as any)?.heatNo || "—"}
        </span>
      ),
    },
    {
      key: "decision",
      header: "Decision",
      cell: (row) => (
        <Badge className={(row.decision as string) === "ACCEPT" ? "bg-green-500" : "bg-red-500"}>
          {row.decision as string}
        </Badge>
      ),
    },
    {
      key: "releasedBy",
      header: "Released By",
      cell: (row) => (row.releasedBy as any)?.name || "—",
    },
  ];

  const labLetterColumns: Column<any>[] = [
    {
      key: "letterNo",
      header: "Letter No.",
      cell: (row) => (
        <Link
          href={`/quality/lab-letters/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.letterNo as string}
        </Link>
      ),
    },
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "specification",
      header: "Specification",
      cell: (row) => (row.specification as string) || "—",
    },
    {
      key: "sizeLabel",
      header: "Size",
      cell: (row) => (row.sizeLabel as string) || "—",
    },
    {
      key: "letterDate",
      header: "Date",
      cell: (row) => format(new Date(row.letterDate as string), "dd MMM yyyy"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Inspections, MTC repository, NCR register, and lab letters"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspections</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open NCRs</CardTitle>
            <FileWarning className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {ncrs.filter((n) => n.status !== "CLOSED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTC Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mtcs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Letters</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labLetters.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="qc-release">QC Release</TabsTrigger>
          <TabsTrigger value="mtc">MTC Repository</TabsTrigger>
          <TabsTrigger value="ncr">NCR Register</TabsTrigger>
          <TabsTrigger value="lab-letters">Lab Letters</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inspection Register</CardTitle>
                <Button onClick={() => router.push("/quality/inspections/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Inspection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={inspectionColumns}
                data={inspections}
                searchKey="inspectionNo"
                searchPlaceholder="Search by inspection number..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qc-release">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>QC Releases</CardTitle>
                <Button onClick={() => router.push("/quality/qc-release/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New QC Release
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={qcReleaseColumns}
                data={qcReleases}
                searchKey="releaseNo"
                searchPlaceholder="Search by release number..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mtc">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>MTC Document Repository</CardTitle>
                <Button onClick={() => router.push("/quality/mtc/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload MTC
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by MTC number or heat number..."
                  value={mtcSearch}
                  onChange={(e) => setMtcSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMtcSearch()}
                  className="max-w-md"
                />
                <Button variant="outline" size="sm" onClick={handleMtcSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                {mtcSearch && (
                  <Button variant="ghost" size="sm" onClick={() => { setMtcSearch(""); fetchMTCs(); }}>
                    Clear
                  </Button>
                )}
              </div>
              <DataTable
                columns={mtcColumns}
                data={mtcs}
                searchKey="mtcNo"
                searchPlaceholder="Filter results..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ncr">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Non-Conformance Reports</CardTitle>
                <Button onClick={() => router.push("/quality/ncr/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New NCR
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={ncrColumns}
                data={ncrs}
                searchKey="ncrNo"
                searchPlaceholder="Search by NCR number..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab-letters">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lab Test Letters</CardTitle>
                <Button onClick={() => router.push("/quality/lab-letters/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Lab Letter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={labLetterColumns}
                data={labLetters}
                searchKey="letterNo"
                searchPlaceholder="Search by letter number..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
