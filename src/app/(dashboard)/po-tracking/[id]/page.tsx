"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2,
  Clock,
  Circle,
  Package,
  FileCheck,
  Warehouse,
  ClipboardCheck,
  TestTube2,
  FileText,
  Truck,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PageLoading } from "@/components/shared/page-loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

interface StageItem {
  label: string;
  value: string;
  href?: string;
}

interface Stage {
  name: string;
  status: StageStatus;
  details: string;
  items: StageItem[];
}

interface ItemProgress {
  sNo: number;
  product: string | null;
  material: string | null;
  sizeLabel: string | null;
  ordered: number;
  dispatched: number;
  status: string;
  dispatchPercentage: number;
}

interface TrackingData {
  order: {
    id: string;
    soNo: string;
    soDate: string;
    customerPoNo: string | null;
    customerName: string;
    projectName: string | null;
    status: string;
  };
  stages: Stage[];
  completionPercentage: number;
  itemProgress: ItemProgress[];
  summary: {
    totalPOs: number;
    totalGRNs: number;
    totalInspections: number;
    totalLabReports: number;
    totalMTCs: number;
    totalPackingLists: number;
    totalDispatchNotes: number;
    totalInvoices: number;
  };
}

// ---------------------------------------------------------------------------
// Stage Icons
// ---------------------------------------------------------------------------

const stageIcons: Record<string, React.ReactNode> = {
  "PO Received": <Package className="h-5 w-5" />,
  "PO Acceptance": <FileCheck className="h-5 w-5" />,
  "Material Preparation": <Warehouse className="h-5 w-5" />,
  Inspection: <ClipboardCheck className="h-5 w-5" />,
  "Lab Testing": <TestTube2 className="h-5 w-5" />,
  Documentation: <FileText className="h-5 w-5" />,
  "Dispatch Clearance": <Truck className="h-5 w-5" />,
};

const stageColors: Record<StageStatus, string> = {
  COMPLETED: "border-green-500 bg-green-50 dark:bg-green-950/30",
  IN_PROGRESS: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  PENDING: "border-muted bg-muted/30",
};

const stageIconColors: Record<StageStatus, string> = {
  COMPLETED: "text-green-600 dark:text-green-400",
  IN_PROGRESS: "text-amber-600 dark:text-amber-400",
  PENDING: "text-muted-foreground/50",
};

const statusBadgeColors: Record<StageStatus, string> = {
  COMPLETED: "bg-green-500",
  IN_PROGRESS: "bg-amber-500",
  PENDING: "bg-muted-foreground/30 text-muted-foreground",
};

const statusLabels: Record<StageStatus, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
};

// ---------------------------------------------------------------------------
// Circular Progress Component
// ---------------------------------------------------------------------------

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 80
      ? "#22c55e"
      : percentage >= 50
        ? "#f59e0b"
        : percentage >= 25
          ? "#3b82f6"
          : "#94a3b8";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 128 128">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/50"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Card Component
// ---------------------------------------------------------------------------

function StageCard({
  stage,
  index,
  isLast,
}: {
  stage: Stage;
  index: number;
  isLast: boolean;
}) {
  const statusIcon =
    stage.status === "COMPLETED" ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : stage.status === "IN_PROGRESS" ? (
      <Clock className="h-5 w-5 text-amber-500" />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground/40" />
    );

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            stage.status === "COMPLETED"
              ? "border-green-500 bg-green-100 dark:bg-green-950"
              : stage.status === "IN_PROGRESS"
                ? "border-amber-500 bg-amber-100 dark:bg-amber-950"
                : "border-muted-foreground/30 bg-muted"
          }`}
        >
          <span className={stageIconColors[stage.status]}>
            {stageIcons[stage.name] || <Circle className="h-5 w-5" />}
          </span>
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[24px] ${
              stage.status === "COMPLETED"
                ? "bg-green-500"
                : "bg-muted-foreground/20"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
        <div
          className={`rounded-lg border-l-4 p-4 ${stageColors[stage.status]}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {index + 1}. {stage.name}
              </h3>
              {statusIcon}
            </div>
            <Badge className={`${statusBadgeColors[stage.status]} text-xs`}>
              {statusLabels[stage.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{stage.details}</p>

          {stage.items.length > 0 && (
            <div className="space-y-1 mt-2">
              {stage.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {item.label}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      item.label
                    )}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono h-5"
                  >
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function POTrackingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchTracking(params.id as string);
  }, [params.id]);

  const fetchTracking = async (id: string) => {
    try {
      const res = await fetch(`/api/po-tracking/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Failed to load tracking data");
      router.push("/po-tracking");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!data) return null;

  const { order, stages, completionPercentage, itemProgress, summary } = data;

  const soStatusColors: Record<string, string> = {
    OPEN: "bg-blue-500",
    PARTIALLY_DISPATCHED: "bg-amber-500",
    FULLY_DISPATCHED: "bg-green-500",
    CLOSED: "bg-gray-500",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order Tracking: ${order.soNo}`}
        description={`${order.customerName}${order.customerPoNo ? ` — PO: ${order.customerPoNo}` : ""}`}
      >
        <Button variant="outline" onClick={() => router.push("/po-tracking")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          All Orders
        </Button>
      </PageHeader>

      {/* Top Section: Order Info + Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Order Information</span>
              <Badge className={`${soStatusColors[order.status] || "bg-gray-500"}`}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Sales Order</div>
                <div className="font-mono font-semibold">{order.soNo}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Customer PO</div>
                <div className="font-mono font-medium">{order.customerPoNo || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="font-medium">{order.customerName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Order Date</div>
                <div>{format(new Date(order.soDate), "dd MMM yyyy")}</div>
              </div>
            </div>

            {order.projectName && (
              <>
                <Separator className="my-3" />
                <div>
                  <div className="text-xs text-muted-foreground">Project</div>
                  <div className="text-sm">{order.projectName}</div>
                </div>
              </>
            )}

            {/* Quick Summary Badges */}
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-2">
              {summary.totalPOs > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalPOs} PO(s)
                </Badge>
              )}
              {summary.totalGRNs > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalGRNs} GRN(s)
                </Badge>
              )}
              {summary.totalInspections > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalInspections} Inspection(s)
                </Badge>
              )}
              {summary.totalLabReports > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalLabReports} Lab Report(s)
                </Badge>
              )}
              {summary.totalMTCs > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalMTCs} MTC(s)
                </Badge>
              )}
              {summary.totalPackingLists > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalPackingLists} Packing List(s)
                </Badge>
              )}
              {summary.totalDispatchNotes > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalDispatchNotes} Dispatch Note(s)
                </Badge>
              )}
              {summary.totalInvoices > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.totalInvoices} Invoice(s)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Circular Progress */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <CircularProgress percentage={completionPercentage} />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium">Order Completion</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stages.filter((s) => s.status === "COMPLETED").length} of {stages.length} stages completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Fulfillment Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {stages.map((stage, index) => (
              <StageCard
                key={stage.name}
                stage={stage}
                index={index}
                isLast={index === stages.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Item-Level Dispatch Progress */}
      {itemProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Item Dispatch Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Dispatched</TableHead>
                  <TableHead className="min-w-[120px]">Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemProgress.map((item) => (
                  <TableRow key={item.sNo}>
                    <TableCell className="text-muted-foreground">{item.sNo}</TableCell>
                    <TableCell className="font-medium text-sm">{item.product || "—"}</TableCell>
                    <TableCell className="text-sm">{item.material || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sizeLabel || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.ordered.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.dispatched.toFixed(3)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.dispatchPercentage >= 100
                                ? "bg-green-500"
                                : item.dispatchPercentage > 0
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground/20"
                            }`}
                            style={{ width: `${Math.min(item.dispatchPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-8 text-right">
                          {item.dispatchPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          item.status === "DISPATCHED"
                            ? "border-green-500 text-green-600"
                            : item.status === "PARTIALLY_DISPATCHED"
                              ? "border-amber-500 text-amber-600"
                              : ""
                        }`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
