"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X as XIcon,
} from "lucide-react";

function ComparePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const compareWith = searchParams.get("compareWith");

  const { data, isLoading, error } = useQuery({
    queryKey: ["quotation-compare", params.id, compareWith],
    queryFn: async () => {
      const url = compareWith
        ? `/api/quotations/${params.id}/compare?compareWith=${compareWith}`
        : `/api/quotations/${params.id}/compare`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to compare revisions");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500">{(error as Error).message}</div>
        </div>
      </div>
    );
  }

  const comparison = data?.comparison;
  if (!comparison) return null;

  const { left, right, headerChanges, itemsAdded, itemsRemoved, itemsModified, itemsUnchanged, termsChanges, summary } = comparison;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Revision Comparison"
          description={`Comparing Rev.${left.version} with Rev.${right.version}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Total Change</div>
              <div className={`text-2xl font-bold ${summary.totalChange > 0 ? "text-green-600" : summary.totalChange < 0 ? "text-red-600" : ""}`}>
                {summary.totalChange > 0 ? "+" : ""}{summary.totalChange.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-sm ${summary.totalChangePercent > 0 ? "text-green-600" : summary.totalChangePercent < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {summary.totalChangePercent > 0 ? "+" : ""}{summary.totalChangePercent}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Items Changed</div>
              <div className="text-2xl font-bold">
                {itemsAdded.length + itemsRemoved.length + itemsModified.length}
              </div>
              <div className="text-sm text-muted-foreground">
                +{itemsAdded.length} / -{itemsRemoved.length} / ~{itemsModified.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Rev.{left.version}</div>
                <Badge variant="secondary">{left.status.replace(/_/g, " ")}</Badge>
                <div className="mt-1 font-semibold">{left.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-muted-foreground">{left.itemCount} items</div>
              </div>
              <div className="flex items-center text-muted-foreground">vs</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Rev.{right.version}</div>
                <Badge variant="secondary">{right.status.replace(/_/g, " ")}</Badge>
                <div className="mt-1 font-semibold">{right.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-muted-foreground">{right.itemCount} items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Changes */}
      {summary.hasHeaderChanges && (
        <Card>
          <CardHeader>
            <CardTitle>Header Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Rev.{left.version} (Previous)</TableHead>
                    <TableHead>Rev.{right.version} (Current)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(headerChanges).map(([field, change]: [string, any]) => (
                    <TableRow key={field}>
                      <TableCell className="font-medium">{field}</TableCell>
                      <TableCell className="text-red-600 line-through">
                        {change.old instanceof String || typeof change.old === "string"
                          ? change.old
                          : change.old ? new Date(change.old).toLocaleDateString() : "---"}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {typeof change.new === "string"
                          ? change.new
                          : change.new ? new Date(change.new).toLocaleDateString() : "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Changes */}
      {summary.hasItemChanges && (
        <Card>
          <CardHeader>
            <CardTitle>Item Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Added Items */}
            {itemsAdded.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Added Items ({itemsAdded.length})
                </h4>
                <div className="rounded-lg border border-green-200 bg-green-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/N</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsAdded.map((item: any) => (
                        <TableRow key={item.sNo}>
                          <TableCell>{item.sNo}</TableCell>
                          <TableCell className="font-medium">{item.product || "---"}</TableCell>
                          <TableCell>{item.material || "---"}</TableCell>
                          <TableCell>{item.sizeLabel || "---"}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitRate?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">{item.amount?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Removed Items */}
            {itemsRemoved.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                  <XIcon className="h-4 w-4" /> Removed Items ({itemsRemoved.length})
                </h4>
                <div className="rounded-lg border border-red-200 bg-red-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/N</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsRemoved.map((item: any) => (
                        <TableRow key={item.sNo} className="line-through opacity-60">
                          <TableCell>{item.sNo}</TableCell>
                          <TableCell>{item.product || "---"}</TableCell>
                          <TableCell>{item.material || "---"}</TableCell>
                          <TableCell>{item.sizeLabel || "---"}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitRate?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.amount?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Modified Items */}
            {itemsModified.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1">
                  <Minus className="h-4 w-4" /> Modified Items ({itemsModified.length})
                </h4>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/N</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead className="text-right">Previous</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsModified.map((item: any) =>
                        Object.entries(item.changes).map(([field, change]: [string, any], idx: number) => (
                          <TableRow key={`${item.sNo}-${field}`}>
                            {idx === 0 && (
                              <>
                                <TableCell rowSpan={Object.keys(item.changes).length}>
                                  {item.sNo}
                                </TableCell>
                                <TableCell rowSpan={Object.keys(item.changes).length} className="font-medium">
                                  {item.product || "---"}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="capitalize">{field}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {typeof change.old === "number" ? change.old.toFixed(2) : change.old || "---"}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {typeof change.new === "number" ? change.new.toFixed(2) : change.new || "---"}
                            </TableCell>
                            <TableCell className="text-right">
                              {typeof change.old === "number" && typeof change.new === "number" ? (
                                <span className={change.new - change.old > 0 ? "text-green-600" : "text-red-600"}>
                                  {change.new - change.old > 0 ? (
                                    <ArrowUp className="h-3 w-3 inline mr-1" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 inline mr-1" />
                                  )}
                                  {Math.abs(change.new - change.old).toFixed(2)}
                                </span>
                              ) : (
                                "---"
                              )}
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
      )}

      {/* Terms Changes */}
      {summary.hasTermsChanges && (
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Rev.{left.version}</TableHead>
                    <TableHead>Rev.{right.version}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termsChanges.map((term: any) => (
                    <TableRow key={term.termName}>
                      <TableCell className="font-medium">{term.termName}</TableCell>
                      <TableCell>
                        <Badge variant={
                          term.change === "added" ? "default" :
                          term.change === "removed" ? "destructive" :
                          "secondary"
                        }>
                          {term.change}
                        </Badge>
                      </TableCell>
                      <TableCell className={term.change === "removed" ? "line-through text-red-600" : "text-muted-foreground"}>
                        {term.old || "---"}
                      </TableCell>
                      <TableCell className={term.change === "added" ? "text-green-600 font-semibold" : "font-semibold"}>
                        {term.new || "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Changes */}
      {!summary.hasHeaderChanges && !summary.hasItemChanges && !summary.hasTermsChanges && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              No differences found between these two revisions.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CompareRevisionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>}>
      <ComparePageContent />
    </Suspense>
  );
}
