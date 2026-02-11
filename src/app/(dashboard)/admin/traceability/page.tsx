"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  ArrowRight,
  ShoppingCart,
  Package,
  ClipboardCheck,
  Warehouse,
  BookmarkCheck,
  PackageCheck,
  Truck,
  FileText,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ==================== Types ====================

interface TraceabilityData {
  heatNo: string;
  purchaseOrder: {
    id: string;
    poNo: string;
    poDate: string;
    vendor: { name: string };
  } | null;
  grn: {
    id: string;
    grnNo: string;
    grnDate: string;
  } | null;
  inspection: {
    id: string;
    inspectionNo: string;
    overallResult: string;
    inspectionDate: string;
  } | null;
  stock: {
    id: string;
    status: string;
    quantityMtr: number;
    pieces: number;
    location: string | null;
  } | null;
  reservation: {
    id: string;
    salesOrder: {
      id: string;
      soNo: string;
    };
    reservedQtyMtr: number;
    status: string;
  } | null;
  packingList: {
    id: string;
    plNo: string;
    plDate: string;
  } | null;
  dispatchNote: {
    id: string;
    dnNo: string;
    dispatchDate: string;
    vehicleNo: string | null;
  } | null;
  invoice: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
  } | null;
  payment: {
    id: string;
    receiptNo: string;
    receiptDate: string;
    amountReceived: number;
    paymentMode: string;
  } | null;
}

// ==================== Stage card colors ====================

const stockStatusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
  RESERVED: "bg-blue-500",
  DISPATCHED: "bg-gray-500",
};

const inspectionResultColors: Record<string, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  HOLD: "bg-yellow-500",
};

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  PARTIALLY_PAID: "bg-yellow-500",
  PAID: "bg-green-500",
  CANCELLED: "bg-red-500",
};

// ==================== Stage Card Component ====================

interface StageCardProps {
  icon: React.ReactNode;
  title: string;
  available: boolean;
  href?: string;
  children: React.ReactNode;
}

function StageCard({ icon, title, available, href, children }: StageCardProps) {
  const router = useRouter();

  if (!available) {
    return (
      <Card className="min-w-[200px] opacity-40 border-dashed">
        <CardHeader className="flex flex-row items-center gap-2 pb-2 space-y-0">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`min-w-[200px] transition-shadow ${
        href ? "cursor-pointer hover:shadow-md" : ""
      }`}
      onClick={() => href && router.push(href)}
    >
      <CardHeader className="flex flex-row items-center gap-2 pb-2 space-y-0">
        <div className="text-primary">{icon}</div>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ==================== Arrow Connector ====================

function ArrowConnector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center flex-shrink-0 px-1">
      <ArrowRight
        className={`h-5 w-5 ${
          active ? "text-primary" : "text-muted-foreground/30"
        }`}
      />
    </div>
  );
}

// ==================== Main Component ====================

export default function TraceabilityPage() {
  const [heatNo, setHeatNo] = useState("");
  const [searchedHeatNo, setSearchedHeatNo] = useState("");
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const trimmed = heatNo.trim();
    if (!trimmed) {
      toast.error("Please enter a heat number");
      return;
    }

    setLoading(true);
    setNotFound(false);
    setData(null);
    setSearchedHeatNo(trimmed);

    try {
      const response = await fetch(
        `/api/traceability/${encodeURIComponent(trimmed)}`
      );

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        toast.error("Failed to fetch traceability data");
        return;
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch traceability:", error);
      toast.error("Failed to fetch traceability data");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Traceability"
        description="Track the complete lifecycle of material by heat number"
      />

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter heat number (e.g., H2024-001)"
                value={heatNo}
                onChange={(e) => setHeatNo(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Searching for heat number...
        </div>
      )}

      {/* Not Found */}
      {notFound && !loading && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No traceability data found for heat number &quot;{searchedHeatNo}
          &quot;. Please verify the heat number and try again.
        </div>
      )}

      {/* Traceability Timeline */}
      {data && !loading && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Lifecycle for Heat No:{" "}
            <span className="font-mono text-primary">{data.heatNo}</span>
          </h3>

          {/* Horizontal flow with overflow scroll */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-stretch gap-0 min-w-max">
              {/* 1. Purchase Order */}
              <StageCard
                icon={<ShoppingCart className="h-4 w-4" />}
                title="Purchase Order"
                available={!!data.purchaseOrder}
                href={
                  data.purchaseOrder
                    ? `/purchase/orders/${data.purchaseOrder.id}`
                    : undefined
                }
              >
                {data.purchaseOrder && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.purchaseOrder.poNo}
                    </p>
                    <p className="text-muted-foreground">
                      {data.purchaseOrder.vendor.name}
                    </p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(data.purchaseOrder.poDate),
                        "dd MMM yyyy"
                      )}
                    </p>
                  </div>
                )}
              </StageCard>

              <ArrowConnector active={!!data.purchaseOrder && !!data.grn} />

              {/* 2. GRN */}
              <StageCard
                icon={<Package className="h-4 w-4" />}
                title="Goods Receipt"
                available={!!data.grn}
                href={
                  data.grn ? `/inventory/grn/${data.grn.id}` : undefined
                }
              >
                {data.grn && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">{data.grn.grnNo}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(data.grn.grnDate), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
              </StageCard>

              <ArrowConnector active={!!data.grn && !!data.inspection} />

              {/* 3. Inspection */}
              <StageCard
                icon={<ClipboardCheck className="h-4 w-4" />}
                title="Inspection"
                available={!!data.inspection}
                href={
                  data.inspection
                    ? `/quality/inspections/${data.inspection.id}`
                    : undefined
                }
              >
                {data.inspection && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.inspection.inspectionNo}
                    </p>
                    <Badge
                      className={
                        inspectionResultColors[data.inspection.overallResult] ||
                        "bg-gray-500"
                      }
                    >
                      {data.inspection.overallResult}
                    </Badge>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(data.inspection.inspectionDate),
                        "dd MMM yyyy"
                      )}
                    </p>
                  </div>
                )}
              </StageCard>

              <ArrowConnector active={!!data.inspection && !!data.stock} />

              {/* 4. Inventory Stock */}
              <StageCard
                icon={<Warehouse className="h-4 w-4" />}
                title="Inventory Stock"
                available={!!data.stock}
                href={
                  data.stock
                    ? `/inventory/stock/${data.stock.id}`
                    : undefined
                }
              >
                {data.stock && (
                  <div className="space-y-1 text-sm">
                    <Badge
                      className={
                        stockStatusColors[data.stock.status] || "bg-gray-500"
                      }
                    >
                      {data.stock.status.replace(/_/g, " ")}
                    </Badge>
                    <p>
                      {Number(data.stock.quantityMtr).toFixed(3)} Mtr /{" "}
                      {data.stock.pieces} Pcs
                    </p>
                    {data.stock.location && (
                      <p className="text-muted-foreground">
                        {data.stock.location}
                      </p>
                    )}
                  </div>
                )}
              </StageCard>

              <ArrowConnector active={!!data.stock && !!data.reservation} />

              {/* 5. Reservation */}
              <StageCard
                icon={<BookmarkCheck className="h-4 w-4" />}
                title="Reservation"
                available={!!data.reservation}
                href={
                  data.reservation
                    ? `/sales/${data.reservation.salesOrder.id}`
                    : undefined
                }
              >
                {data.reservation && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      SO: {data.reservation.salesOrder.soNo}
                    </p>
                    <p>
                      {Number(data.reservation.reservedQtyMtr).toFixed(3)} Mtr
                    </p>
                    <Badge variant="outline">
                      {data.reservation.status}
                    </Badge>
                  </div>
                )}
              </StageCard>

              <ArrowConnector
                active={!!data.reservation && !!data.packingList}
              />

              {/* 6. Packing List */}
              <StageCard
                icon={<PackageCheck className="h-4 w-4" />}
                title="Packing List"
                available={!!data.packingList}
                href={
                  data.packingList
                    ? `/dispatch/packing-lists/${data.packingList.id}`
                    : undefined
                }
              >
                {data.packingList && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.packingList.plNo}
                    </p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(data.packingList.plDate),
                        "dd MMM yyyy"
                      )}
                    </p>
                  </div>
                )}
              </StageCard>

              <ArrowConnector
                active={!!data.packingList && !!data.dispatchNote}
              />

              {/* 7. Dispatch Note */}
              <StageCard
                icon={<Truck className="h-4 w-4" />}
                title="Dispatch Note"
                available={!!data.dispatchNote}
                href={
                  data.dispatchNote
                    ? `/dispatch/dispatch-notes/${data.dispatchNote.id}`
                    : undefined
                }
              >
                {data.dispatchNote && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.dispatchNote.dnNo}
                    </p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(data.dispatchNote.dispatchDate),
                        "dd MMM yyyy"
                      )}
                    </p>
                    {data.dispatchNote.vehicleNo && (
                      <p className="text-muted-foreground">
                        Vehicle: {data.dispatchNote.vehicleNo}
                      </p>
                    )}
                  </div>
                )}
              </StageCard>

              <ArrowConnector
                active={!!data.dispatchNote && !!data.invoice}
              />

              {/* 8. Invoice */}
              <StageCard
                icon={<FileText className="h-4 w-4" />}
                title="Invoice"
                available={!!data.invoice}
                href={
                  data.invoice
                    ? `/dispatch/invoices/${data.invoice.id}`
                    : undefined
                }
              >
                {data.invoice && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.invoice.invoiceNo}
                    </p>
                    <p>
                      {"\u20B9"}
                      {Number(data.invoice.totalAmount).toFixed(2)}
                    </p>
                    <Badge
                      className={
                        invoiceStatusColors[data.invoice.status] ||
                        "bg-gray-500"
                      }
                    >
                      {data.invoice.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
              </StageCard>

              <ArrowConnector active={!!data.invoice && !!data.payment} />

              {/* 9. Payment */}
              <StageCard
                icon={<CreditCard className="h-4 w-4" />}
                title="Payment"
                available={!!data.payment}
              >
                {data.payment && (
                  <div className="space-y-1 text-sm">
                    <p className="font-mono font-medium">
                      {data.payment.receiptNo}
                    </p>
                    <p>
                      {"\u20B9"}
                      {Number(data.payment.amountReceived).toFixed(2)}
                    </p>
                    <Badge variant="outline">{data.payment.paymentMode}</Badge>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(data.payment.receiptDate),
                        "dd MMM yyyy"
                      )}
                    </p>
                  </div>
                )}
              </StageCard>
            </div>
          </div>

          {/* Summary section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Traceability Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Heat Number</p>
                  <p className="font-mono font-medium">{data.heatNo}</p>
                </div>
                {data.purchaseOrder && (
                  <div>
                    <p className="text-muted-foreground">Vendor</p>
                    <p className="font-medium">
                      {data.purchaseOrder.vendor.name}
                    </p>
                  </div>
                )}
                {data.stock && (
                  <div>
                    <p className="text-muted-foreground">Stock Status</p>
                    <Badge
                      className={
                        stockStatusColors[data.stock.status] || "bg-gray-500"
                      }
                    >
                      {data.stock.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
                {data.reservation?.salesOrder && (
                  <div>
                    <p className="text-muted-foreground">Sales Order</p>
                    <p className="font-mono font-medium">
                      {data.reservation.salesOrder.soNo}
                    </p>
                  </div>
                )}
                {data.invoice && (
                  <div>
                    <p className="text-muted-foreground">Invoice Status</p>
                    <Badge
                      className={
                        invoiceStatusColors[data.invoice.status] ||
                        "bg-gray-500"
                      }
                    >
                      {data.invoice.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
