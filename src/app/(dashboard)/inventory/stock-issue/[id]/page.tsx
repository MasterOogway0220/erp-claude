"use client";

import { useState, useEffect, use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

export default function StockIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stockIssue, setStockIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Stock Issue: ${stockIssue.issueNo}`}
        description={`Issued on ${format(new Date(stockIssue.issueDate), "dd MMM yyyy")}`}
      />

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
