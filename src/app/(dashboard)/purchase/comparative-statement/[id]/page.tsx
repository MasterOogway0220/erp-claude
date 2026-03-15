"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PageLoading } from "@/components/shared/page-loading";
import {
  ArrowLeft,
  CheckCircle,
  Send,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
};

const rankBadgeColors: Record<string, string> = {
  L1: "bg-green-500",
  L2: "bg-blue-500",
  L3: "bg-orange-500",
};

interface CSVendor {
  id: string;
  vendor: {
    id: string;
    name: string;
  };
  materialCost: number;
  freight: number;
  testingCharges: number;
  tpiCharges: number;
  packingForwarding: number;
  taxAmount: number;
  totalLandedCost: number;
  deliveryDays: number;
  paymentTerms: string;
  priceBasis: string;
  rank: number;
}

export default function CSDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cs, setCs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Vendor selection state
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedRank, setSelectedRank] = useState<number>(0);
  const [justificationRemarks, setJustificationRemarks] = useState("");

  useEffect(() => {
    if (id) fetchCS();
  }, [id]);

  const fetchCS = async () => {
    try {
      const response = await fetch(`/api/purchase/comparative-statement/${id}`);
      if (response.ok) {
        const data = await response.json();
        const csData = data.comparativeStatement || data;
        setCs(csData);
        if (csData.selectedVendorId) {
          setSelectedVendorId(csData.selectedVendorId);
        }
        if (csData.selectedRank) {
          setSelectedRank(csData.selectedRank);
        }
        if (csData.justificationRemarks) {
          setJustificationRemarks(csData.justificationRemarks);
        }
      } else {
        toast.error("Failed to load Comparative Statement");
      }
    } catch (error) {
      toast.error("Failed to load Comparative Statement");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    const vendors: CSVendor[] = cs.vendors || cs.csVendors || [];
    const selectedEntry = vendors.find(
      (v) => v.vendor?.id === selectedVendorId
    );
    const rank = selectedEntry?.rank || 0;

    if (rank > 1 && !justificationRemarks.trim()) {
      toast.error(
        "Justification remarks are required when not selecting L1 vendor"
      );
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(
        `/api/purchase/comparative-statement/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedVendorId,
            selectedRank: rank,
            justificationRemarks: rank > 1 ? justificationRemarks : undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success("Vendor selected successfully");
        fetchCS();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to select vendor");
      }
    } catch (error) {
      toast.error("Failed to select vendor");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/purchase/comparative-statement/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success(
          newStatus === "PENDING_APPROVAL"
            ? "Submitted for approval"
            : newStatus === "APPROVED"
              ? "Comparative Statement approved"
              : "Status updated"
        );
        fetchCS();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!cs) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comparative Statement Not Found"
          description="The requested CS could not be found."
        />
        <Button
          variant="outline"
          onClick={() => router.push("/purchase/comparative-statement")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const vendors: CSVendor[] = cs.vendors || cs.csVendors || [];
  const sortedVendors = [...vendors].sort(
    (a, b) => (a.rank || 999) - (b.rank || 999)
  );
  const l1VendorId = sortedVendors.find((v) => v.rank === 1)?.vendor?.id;

  const getRankLabel = (rank: number) => `L${rank}`;
  const getRankColor = (rank: number) =>
    rankBadgeColors[`L${rank}`] || "bg-gray-500";

  const comparisonParams: Array<{ label: string; key: string; format: (v: any) => string; bold?: boolean }> = [
    {
      label: "Material Cost",
      key: "materialCost",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "Freight",
      key: "freight",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "Testing Charges",
      key: "testingCharges",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "TPI Charges",
      key: "tpiCharges",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "Packing & Forwarding",
      key: "packingForwarding",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "Tax Amount",
      key: "taxAmount",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      label: "Total Landed Cost",
      key: "totalLandedCost",
      format: (v) => `₹${Number(v || 0).toFixed(2)}`,
      bold: true,
    },
    {
      label: "Delivery (days)",
      key: "deliveryDays",
      format: (v) => `${v || "—"} days`,
    },
    {
      label: "Payment Terms",
      key: "paymentTerms",
      format: (v) => v || "—",
    },
    {
      label: "Price Basis",
      key: "priceBasis",
      format: (v) => (v ? String(v).replace(/_/g, " ") : "—"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Comparative Statement: ${cs.csNo || "—"}`}
        description="Vendor comparison and selection"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/purchase/comparative-statement")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {cs.status === "APPROVED" && cs.selectedVendorId && (
            <Button
              onClick={() =>
                router.push(
                  `/purchase/orders/create?csId=${id}&vendorId=${cs.selectedVendorId}&prId=${cs.purchaseRequisitionId || cs.prId || ""}`
                )
              }
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Generate PO
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CS Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CS Number</p>
              <p className="font-mono font-medium">{cs.csNo || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>
                {cs.csDate
                  ? format(new Date(cs.csDate), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[cs.status] || "bg-gray-500"}>
                {cs.status?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PR Reference</p>
              <p className="font-mono">
                {cs.purchaseRequisition?.prNo || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">RFQ Reference</p>
              <p className="font-mono">{cs.rfq?.rfqNo || "—"}</p>
            </div>
            {cs.selectedVendor && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Selected Vendor
                </p>
                <p className="font-medium">{cs.selectedVendor.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendor Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] bg-muted/50 font-semibold">
                    Parameter
                  </TableHead>
                  {sortedVendors.map((v) => (
                    <TableHead
                      key={v.id}
                      className={`min-w-[180px] text-center ${
                        v.rank === 1
                          ? "bg-green-50 dark:bg-green-950/30"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">
                          {v.vendor?.name || "—"}
                        </span>
                        {v.rank === 1 && (
                          <Badge className="bg-green-500 text-xs">
                            Lowest
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonParams.map((param) => (
                  <TableRow key={param.key}>
                    <TableCell
                      className={`bg-muted/50 ${param.bold ? "font-bold" : ""}`}
                    >
                      {param.label}
                    </TableCell>
                    {sortedVendors.map((v) => (
                      <TableCell
                        key={v.id}
                        className={`text-center ${
                          param.bold ? "font-bold" : ""
                        } ${
                          v.rank === 1
                            ? "bg-green-50 dark:bg-green-950/30"
                            : ""
                        }`}
                      >
                        {param.format((v as Record<string, any>)[param.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Rank Row */}
                <TableRow>
                  <TableCell className="bg-muted/50 font-bold">Rank</TableCell>
                  {sortedVendors.map((v) => (
                    <TableCell
                      key={v.id}
                      className={`text-center ${
                        v.rank === 1
                          ? "bg-green-50 dark:bg-green-950/30"
                          : ""
                      }`}
                    >
                      <Badge className={getRankColor(v.rank)}>
                        {getRankLabel(v.rank)}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Selection (only in DRAFT) */}
      {cs.status === "DRAFT" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendor Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <Label>Select Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={(val) => {
                  setSelectedVendorId(val);
                  const entry = vendors.find((v) => v.vendor?.id === val);
                  setSelectedRank(entry?.rank || 0);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedVendors.map((v) => (
                    <SelectItem key={v.vendor?.id} value={v.vendor?.id}>
                      {v.vendor?.name} ({getRankLabel(v.rank)} — ₹
                      {Number(v.totalLandedCost || 0).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVendorId && selectedRank > 1 && (
              <div className="max-w-md">
                <div className="flex items-center gap-2 mb-1">
                  <Label>Justification Remarks</Label>
                  <Badge className="bg-orange-500 text-xs">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  You are selecting {getRankLabel(selectedRank)} vendor instead
                  of L1. Please provide justification.
                </p>
                <Textarea
                  value={justificationRemarks}
                  onChange={(e) => setJustificationRemarks(e.target.value)}
                  placeholder="Enter justification for not selecting L1 vendor..."
                  rows={3}
                />
              </div>
            )}

            <Button
              onClick={handleSelectVendor}
              disabled={updating || !selectedVendorId}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updating ? "Saving..." : "Confirm Vendor Selection"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Approval Section */}
      {cs.status === "DRAFT" && cs.selectedVendorId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => handleStatusUpdate("PENDING_APPROVAL")}
                disabled={updating}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cs.status === "PENDING_APPROVAL" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => handleStatusUpdate("APPROVED")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate("REJECTED")}
                disabled={updating}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate PO (when APPROVED) */}
      {cs.status === "APPROVED" && cs.selectedVendorId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This comparative statement has been approved. You can now generate
              a Purchase Order for the selected vendor.
            </p>
            <Button
              onClick={() =>
                router.push(
                  `/purchase/orders/create?csId=${id}&vendorId=${cs.selectedVendorId}&prId=${cs.purchaseRequisitionId || cs.prId || ""}`
                )
              }
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Generate Purchase Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
