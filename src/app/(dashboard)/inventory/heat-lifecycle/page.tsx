"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Package,
  ClipboardCheck,
  FileText,
  Truck,
  ShoppingCart,
  FileWarning,
  Warehouse,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
  RESERVED: "bg-blue-500",
  DISPATCHED: "bg-purple-500",
};

const inspectionResultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  HOLD: "bg-yellow-500",
};

const verificationStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  VERIFIED: "bg-green-500",
  DISCREPANT: "bg-red-500",
};

function HeatLifecycleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialHeatNo = searchParams.get("heatNo") || "";
  const [heatNo, setHeatNo] = useState(initialHeatNo);
  const [searchInput, setSearchInput] = useState(initialHeatNo);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (heatNo) {
      fetchLifecycle(heatNo);
    }
  }, [heatNo]);

  const fetchLifecycle = async (heat: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search/heat-number?heatNo=${encodeURIComponent(heat)}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error("Failed to fetch lifecycle:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setHeatNo(searchInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Heat Number Lifecycle"
        description="Track complete material lifecycle from procurement to dispatch"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter heat number..."
              className="max-w-md"
            />
            <Button type="submit" disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {data && data.totalStocks === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No inventory stock found for heat number &quot;{data.heatNo}&quot;
          </CardContent>
        </Card>
      )}

      {data && data.lifecycle?.map((stock: any) => (
        <Card key={stock.stockId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Warehouse className="h-5 w-5" />
                Heat No: {stock.heatNo || "N/A"}
              </CardTitle>
              <Badge className={statusColors[stock.status] || "bg-gray-500"}>
                {stock.status?.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {stock.product || ""} {stock.specification ? `| ${stock.specification}` : ""} {stock.sizeLabel ? `| ${stock.sizeLabel}` : ""}
              {" -- "}{Number(stock.quantityMtr).toFixed(3)} Mtr, {stock.pieces} Pcs
              {stock.location ? ` | Location: ${stock.location}` : ""}
              {stock.rackNo ? ` | Rack: ${stock.rackNo}` : ""}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Procurement */}
            {stock.procurement && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  Procurement
                </h4>
                <div className="ml-6 text-sm space-y-1">
                  {stock.procurement.poNo && (
                    <div>
                      PO:{" "}
                      <Link href={`/purchase/orders/${stock.procurement.poId}`} className="text-blue-600 hover:underline">
                        {stock.procurement.poNo}
                      </Link>
                      {stock.procurement.vendorName && <span className="text-muted-foreground"> ({stock.procurement.vendorName})</span>}
                    </div>
                  )}
                  <div>
                    GRN:{" "}
                    <Link href={`/inventory/grn/${stock.procurement.grnId}`} className="text-blue-600 hover:underline">
                      {stock.procurement.grnNo}
                    </Link>
                    <span className="text-muted-foreground ml-2">
                      {format(new Date(stock.procurement.grnDate), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Inspections */}
            {stock.inspections.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <ClipboardCheck className="h-4 w-4 text-yellow-600" />
                  Inspections ({stock.inspections.length})
                </h4>
                <div className="ml-6 space-y-1">
                  {stock.inspections.map((insp: any) => (
                    <div key={insp.id} className="flex items-center gap-2 text-sm">
                      <Link href={`/quality/inspections/${insp.id}`} className="text-blue-600 hover:underline font-mono">
                        {insp.inspectionNo}
                      </Link>
                      <Badge className={`${inspectionResultColors[insp.overallResult] || "bg-gray-500"} text-xs`}>
                        {insp.overallResult}
                      </Badge>
                      {insp.inspectionType && (
                        <span className="text-xs text-muted-foreground">
                          ({insp.inspectionType.replace(/_/g, " ")})
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {format(new Date(insp.inspectionDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MTC Documents */}
            {stock.mtcDocuments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-teal-500" />
                  MTC Documents ({stock.mtcDocuments.length})
                </h4>
                <div className="ml-6 space-y-1">
                  {stock.mtcDocuments.map((mtc: any) => (
                    <div key={mtc.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{mtc.mtcNo}</span>
                      <Badge className={`${verificationStatusColors[mtc.verificationStatus || "PENDING"] || "bg-gray-500"} text-xs`}>
                        {mtc.verificationStatus || "PENDING"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NCRs */}
            {stock.ncrs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <FileWarning className="h-4 w-4 text-red-500" />
                  Non-Conformance Reports ({stock.ncrs.length})
                </h4>
                <div className="ml-6 space-y-1">
                  {stock.ncrs.map((ncr: any) => (
                    <div key={ncr.id} className="flex items-center gap-2 text-sm">
                      <Link href={`/quality/ncr/${ncr.id}`} className="text-blue-600 hover:underline font-mono">
                        {ncr.ncrNo}
                      </Link>
                      <Badge className={`${ncr.status === "OPEN" ? "bg-red-500" : ncr.status === "CLOSED" ? "bg-green-500" : "bg-yellow-500"} text-xs`}>
                        {ncr.status}
                      </Badge>
                      {ncr.type && (
                        <span className="text-xs text-muted-foreground">
                          ({ncr.type.replace(/_/g, " ")})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reservations / Sales Orders */}
            {stock.reservations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-purple-500" />
                  Sales Reservations ({stock.reservations.length})
                </h4>
                <div className="ml-6 space-y-1">
                  {stock.reservations.map((res: any) => (
                    <div key={res.id} className="flex items-center gap-2 text-sm">
                      {res.soNo && (
                        <Link href={`/sales-orders/${res.salesOrderId}`} className="text-blue-600 hover:underline">
                          {res.soNo}
                        </Link>
                      )}
                      {res.customerName && (
                        <span className="text-muted-foreground">({res.customerName})</span>
                      )}
                      <span>
                        {Number(res.reservedQtyMtr).toFixed(3)} Mtr, {res.reservedPieces} Pcs
                      </span>
                      <Badge className={`${res.status === "RESERVED" ? "bg-blue-500" : res.status === "DISPATCHED" ? "bg-purple-500" : "bg-gray-500"} text-xs`}>
                        {res.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dispatch */}
            {stock.dispatch.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-emerald-500" />
                  Dispatch ({stock.dispatch.length})
                </h4>
                <div className="ml-6 space-y-1">
                  {stock.dispatch.map((d: any) => (
                    <div key={d.packingListId} className="text-sm space-y-1">
                      <div>
                        Packing List:{" "}
                        <Link href={`/dispatch/packing-lists/${d.packingListId}`} className="text-blue-600 hover:underline font-mono">
                          {d.plNo}
                        </Link>
                      </div>
                      {d.dispatchNotes.map((dn: any) => (
                        <div key={dn.id} className="ml-4 flex items-center gap-2">
                          DN:{" "}
                          <Link href={`/dispatch/dispatch-notes/${dn.id}`} className="text-blue-600 hover:underline font-mono">
                            {dn.dnNo}
                          </Link>
                          <span className="text-muted-foreground">
                            {format(new Date(dn.dispatchDate), "dd MMM yyyy")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state within a stock */}
            {!stock.procurement &&
              stock.inspections.length === 0 &&
              stock.mtcDocuments.length === 0 &&
              stock.ncrs.length === 0 &&
              stock.reservations.length === 0 &&
              stock.dispatch.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No lifecycle events found for this stock item.
                </p>
              )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function HeatLifecyclePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <HeatLifecycleContent />
    </Suspense>
  );
}
