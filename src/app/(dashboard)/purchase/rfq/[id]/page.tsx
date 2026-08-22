"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { PageLoading } from "@/components/shared/page-loading";
import { ArrowLeft, Send, BarChart3, ClipboardEdit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { prItemFields } from "@/lib/purchase/pr-item-fields";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_RESPONDED: "bg-yellow-500",
  ALL_RESPONDED: "bg-green-500",
  CLOSED: "bg-purple-500",
};

interface RFQVendor {
  id: string;
  vendor: {
    id: string;
    name: string;
    city?: string;
    email?: string;
  };
  sentDate?: string;
  responseStatus: string;
  quotation?: any;
}

export default function RFQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);


  useEffect(() => {
    if (id) fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/purchase/rfq/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfq(data.rfq || data);
      } else {
        toast.error("Failed to load RFQ");
      }
    } catch (error) {
      toast.error("Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToVendors = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/purchase/rfq/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (response.ok) {
        toast.success("RFQ sent to vendors");
        fetchRFQ();
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

  const handleGenerateCS = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/purchase/comparative-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: id }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Comparative Statement generated");
        router.push(
          `/purchase/comparative-statement/${data.comparativeStatement?.id || data.id || ""}`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate CS");
      }
    } catch (error) {
      toast.error("Failed to generate Comparative Statement");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!rfq) {
    return (
      <div className="space-y-6">
        <PageHeader title="RFQ Not Found" description="The requested RFQ could not be found." />
        <Button variant="outline" onClick={() => router.push("/purchase/rfq")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFQs
        </Button>
      </div>
    );
  }

  const prItems = rfq.purchaseRequisition?.items || rfq.items || [];
  const rfqVendors: RFQVendor[] = rfq.vendors || rfq.rfqVendors || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`RFQ: ${rfq.rfqNo || "—"}`}
        description="Request for Quotation details"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/purchase/rfq")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {rfq.status === "DRAFT" && (
            <Button onClick={handleSendToVendors} disabled={updating}>
              <Send className="w-4 h-4 mr-2" />
              Send to Vendors
            </Button>
          )}
          {(rfq.status === "ALL_RESPONDED" ||
            rfq.status === "PARTIALLY_RESPONDED" ||
            rfq.status === "SENT") && (
            <Button onClick={handleGenerateCS} disabled={updating}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Comparative Statement
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RFQ Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">RFQ Number</p>
              <p className="font-mono font-medium">{rfq.rfqNo || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>
                {rfq.rfqDate
                  ? format(new Date(rfq.rfqDate), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[rfq.status] || "bg-gray-500"}>
                {rfq.status?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PR Reference</p>
              <p className="font-mono">
                {rfq.purchaseRequisition?.prNo || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Submission Deadline
              </p>
              <p>
                {rfq.submissionDeadline
                  ? format(new Date(rfq.submissionDeadline), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            {rfq.remarks && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p>{rfq.remarks}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PR Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PR Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  {/* Carried from Order Processing via the PR. The vendor is
                      being asked to quote against these, not just the size. */}
                  <TableHead className="min-w-[220px]">Technical Requirements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  prItems.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {prItemFields(item).name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prItemFields(item).spec || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell>{prItemFields(item).unit || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-pre-line">
                        {item.technicalRequirements || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Responses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Vendor Response Status</CardTitle>
            {/* Quoting is per vendor — the button lives on each vendor row. */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Response Status</TableHead>
                  <TableHead>Quote Received</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqVendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      No vendors assigned
                    </TableCell>
                  </TableRow>
                ) : (
                  rfqVendors.map((rv) => (
                    <TableRow key={rv.id}>
                      <TableCell className="font-medium">
                        {rv.vendor?.name || "—"}
                      </TableCell>
                      <TableCell>{rv.vendor?.city || "—"}</TableCell>
                      <TableCell>
                        {rv.sentDate
                          ? format(new Date(rv.sentDate), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rv.responseStatus === "RESPONDED"
                              ? "bg-green-500"
                              : rv.responseStatus === "PENDING"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                          }
                        >
                          {rv.responseStatus?.replace(/_/g, " ") || "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rv.quotation ? (
                          <Badge className="bg-green-500">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(`/purchase/rfq/${id}/quote/${rv.id}`)
                          }
                          disabled={rfq.status === "DRAFT"}
                        >
                          <ClipboardEdit className="w-4 h-4 mr-1" />
                          Enter Quote
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
