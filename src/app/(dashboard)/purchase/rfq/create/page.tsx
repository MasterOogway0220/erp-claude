"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PageLoading } from "@/components/shared/page-loading";
import { ArrowLeft, Send, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PRItem {
  id: string;
  sNo: number;
  product?: string;
  material?: string;
  additionalSpec?: string;
  sizeLabel?: string;
  quantity: number;
  uom?: string;
  remarks?: string;
}

interface PR {
  id: string;
  prNo: string;
  prDate: string;
  status: string;
  items: PRItem[];
  salesOrder?: { soNo: string };
  suggestedVendor?: { id: string; name: string };
}

interface Vendor {
  id: string;
  name: string;
  city?: string;
  email?: string;
  phone?: string;
}

function CreateRFQContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prIdFromQuery = searchParams.get("prId");

  const [prs, setPrs] = useState<PR[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string>(prIdFromQuery || "");
  const [selectedPr, setSelectedPr] = useState<PR | null>(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [remarks, setRemarks] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPrId && prs.length > 0) {
      const pr = prs.find((p) => p.id === selectedPrId);
      setSelectedPr(pr || null);
      // Auto-select suggested vendor if the PR has one
      if (pr?.suggestedVendor?.id) {
        setSelectedVendorIds((prev) =>
          prev.includes(pr.suggestedVendor!.id) ? prev : [...prev, pr.suggestedVendor!.id]
        );
      }
    } else {
      setSelectedPr(null);
    }
  }, [selectedPrId, prs]);

  const fetchInitialData = async () => {
    try {
      const [prResponse, vendorResponse] = await Promise.all([
        fetch("/api/purchase/requisitions?status=APPROVED"),
        fetch("/api/masters/vendors"),
      ]);

      if (prResponse.ok) {
        const prData = await prResponse.json();
        setPrs(prData.purchaseRequisitions || []);
      }

      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        setVendors(vendorData.vendors || []);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      (v.city && v.city.toLowerCase().includes(vendorSearch.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!selectedPrId) {
      toast.error("Please select a Purchase Requisition");
      return;
    }
    if (selectedVendorIds.length === 0) {
      toast.error("Please select at least one vendor");
      return;
    }
    if (!submissionDeadline) {
      toast.error("Please set a submission deadline");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/purchase/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prId: selectedPrId,
          submissionDeadline,
          remarks,
          vendorIds: selectedVendorIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("RFQ created successfully");
        router.push(`/purchase/rfq/${data.rfq?.id || data.id || ""}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create RFQ");
      }
    } catch (error) {
      toast.error("Failed to create RFQ");
    } finally {
      setSubmitting(false);
    }
  };

  // Build item description from fields
  const itemDesc = (item: PRItem) => {
    const parts = [item.material, item.additionalSpec, item.sizeLabel].filter(Boolean);
    return parts.join(" | ") || "—";
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Request for Quotation"
        description="Send RFQ to multiple vendors for competitive pricing"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Step 1: Select PR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Step 1: Select Purchase Requisition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="pr-select">Approved Purchase Requisition</Label>
            <Select
              value={selectedPrId || "NONE"}
              onValueChange={(v) => setSelectedPrId(v === "NONE" ? "" : v)}
            >
              <SelectTrigger id="pr-select" className="mt-1">
                <SelectValue placeholder="Select a PR..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE" disabled>Select a PR...</SelectItem>
                {prs.length === 0 ? (
                  <SelectItem value="__empty__" disabled>No approved PRs found</SelectItem>
                ) : (
                  prs.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.prNo} — {format(new Date(pr.prDate), "dd MMM yyyy")}
                      {pr.salesOrder ? ` (SO: ${pr.salesOrder.soNo})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPr && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-medium">PR Items</h4>
                {selectedPr.suggestedVendor && (
                  <Badge variant="outline">
                    Suggested Vendor: {selectedPr.suggestedVendor.name}
                  </Badge>
                )}
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Material / Spec / Size</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPr.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          No items in this PR
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedPr.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">
                            {item.sNo || index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.product || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {itemDesc(item)}
                          </TableCell>
                          <TableCell className="text-right">
                            {parseFloat(String(item.quantity))}
                          </TableCell>
                          <TableCell>{item.uom || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.remarks || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Vendors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2: Select Vendors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors by name or city..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
            />
          </div>

          {selectedVendorIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedVendorIds.length} vendor(s) selected
            </p>
          )}

          <div className="border rounded-md max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleVendor(vendor.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedVendorIds.includes(vendor.id)}
                          onCheckedChange={() => toggleVendor(vendor.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {vendor.name}
                      </TableCell>
                      <TableCell>{vendor.city || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {vendor.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {vendor.phone || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Deadline & Remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Step 3: Submission Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deadline">Submission Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Any special instructions or requirements..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Creating..." : "Create RFQ"}
        </Button>
      </div>
    </div>
  );
}

export default function CreateRFQPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateRFQContent />
    </Suspense>
  );
}
