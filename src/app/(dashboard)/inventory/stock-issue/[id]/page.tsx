"use client";

import { useState, useEffect, use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Send, CheckCircle, XCircle, RotateCcw, Printer } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING_AUTHORIZATION: "bg-yellow-500",
  AUTHORIZED: "bg-green-500",
  REJECTED: "bg-red-500",
};

export default function StockIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stockIssue, setStockIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchStockIssue();
  }, [id]);

  const fetchStockIssue = async () => {
    try {
      const res = await fetch(`/api/inventory/stock-issue/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStockIssue(data.stockIssue);
      }
    } catch (error) {
      console.error("Failed to fetch stock issue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/inventory/stock-issue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
        return;
      }
      const data = await res.json();
      setStockIssue(data.stockIssue);
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintSlip = async () => {
    try {
      const res = await fetch(`/api/inventory/stock-issue/${id}/pdf`);
      if (!res.ok) {
        toast.error("Failed to generate Issue Slip");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Issue-Slip-${stockIssue?.issueNo?.replace(/\//g, "-") || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download Issue Slip");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock Issue Detail" description="Loading..." />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!stockIssue) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock Issue Not Found" description="The requested stock issue could not be found" />
      </div>
    );
  }

  const status = stockIssue.status || "DRAFT";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Stock Issue: ${stockIssue.issueNo}`}
        description={`Issued on ${format(new Date(stockIssue.issueDate), "dd MMM yyyy")}`}
      >
        <div className="flex items-center gap-2">
          {status === "DRAFT" && (
            <Button onClick={() => handleStatusChange("PENDING_AUTHORIZATION")} disabled={updating}>
              <Send className="w-4 h-4 mr-2" />
              Submit for Authorization
            </Button>
          )}
          {status === "PENDING_AUTHORIZATION" && (
            <>
              <Button onClick={() => handleStatusChange("AUTHORIZED")} disabled={updating} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Authorize
              </Button>
              <Button onClick={() => handleStatusChange("REJECTED")} disabled={updating} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {status === "REJECTED" && (
            <Button onClick={() => handleStatusChange("DRAFT")} disabled={updating} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert to Draft
            </Button>
          )}
          <Button onClick={handlePrintSlip} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Issue Slip
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue No.</span>
              <span className="font-mono font-medium">{stockIssue.issueNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{format(new Date(stockIssue.issueDate), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className={statusColors[status] || "bg-gray-500"}>
                {status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issued By</span>
              <span>{stockIssue.issuedBy?.name || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authorized By</span>
              <span>{stockIssue.authorizedBy?.name || "\u2014"}</span>
            </div>
            {stockIssue.remarks && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarks</span>
                <span>{stockIssue.remarks}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SO No.</span>
              <Link
                href={`/sales/${stockIssue.salesOrder?.id}`}
                className="font-mono text-blue-600 hover:underline"
              >
                {stockIssue.salesOrder?.soNo || "\u2014"}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{stockIssue.salesOrder?.customer?.name || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SO Status</span>
              <Badge>{stockIssue.salesOrder?.status?.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued Items ({stockIssue.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Heat No.</th>
                  <th className="p-2 text-left">Size</th>
                  <th className="p-2 text-left">Material</th>
                  <th className="p-2 text-right">Qty (Mtr)</th>
                  <th className="p-2 text-right">Pieces</th>
                  <th className="p-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {stockIssue.items?.map((item: any, index: number) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-mono">{item.heatNo || "\u2014"}</td>
                    <td className="p-2">{item.sizeLabel || "\u2014"}</td>
                    <td className="p-2">{item.material || "\u2014"}</td>
                    <td className="p-2 text-right">{Number(item.quantityMtr).toFixed(3)}</td>
                    <td className="p-2 text-right">{item.pieces}</td>
                    <td className="p-2">{item.location || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
