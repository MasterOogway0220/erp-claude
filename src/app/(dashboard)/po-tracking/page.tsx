"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
  TrendingUp,
  Package,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

interface TrackingOrder {
  id: string;
  soNo: string;
  soDate: string;
  customerPoNo: string | null;
  customerName: string;
  projectName: string | null;
  status: string;
  poAcceptanceStatus: string;
  stages: { name: string; status: StageStatus }[];
  completionPercentage: number;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500",
  PARTIALLY_DISPATCHED: "bg-amber-500",
  FULLY_DISPATCHED: "bg-green-500",
  CLOSED: "bg-gray-500",
};

const stageStatusIcon = (status: StageStatus) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    case "PENDING":
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
  }
};

// ---------------------------------------------------------------------------
// Completion Bar Component
// ---------------------------------------------------------------------------

function CompletionBar({ percentage }: { percentage: number }) {
  const color =
    percentage >= 80
      ? "bg-green-500"
      : percentage >= 50
        ? "bg-amber-500"
        : percentage >= 25
          ? "bg-blue-500"
          : "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold w-8 text-right">
        {percentage}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Stage Pipeline Component
// ---------------------------------------------------------------------------

function MiniPipeline({ stages }: { stages: { name: string; status: StageStatus }[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center" title={`${stage.name}: ${stage.status.replace(/_/g, " ")}`}>
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              stage.status === "COMPLETED"
                ? "bg-green-500"
                : stage.status === "IN_PROGRESS"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/20"
            }`}
          />
          {i < stages.length - 1 && (
            <div
              className={`h-0.5 w-2 ${
                stage.status === "COMPLETED"
                  ? "bg-green-500"
                  : "bg-muted-foreground/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function POTrackingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/po-tracking?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("Failed to fetch tracking data");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Stats
  const totalOrders = orders.length;
  const avgCompletion = totalOrders > 0
    ? Math.round(orders.reduce((sum, o) => sum + o.completionPercentage, 0) / totalOrders)
    : 0;
  const fullyDispatched = orders.filter((o) => o.status === "FULLY_DISPATCHED" || o.status === "CLOSED").length;
  const atRisk = orders.filter((o) => o.completionPercentage < 30 && o.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="P.O. Status Tracking"
        description="Live order status tracking across the fulfillment pipeline"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{avgCompletion}%</div>
                <p className="text-xs text-muted-foreground">Avg. Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{fullyDispatched}</div>
                <p className="text-xs text-muted-foreground">Fully Dispatched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{atRisk}</div>
                <p className="text-xs text-muted-foreground">Low Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Order Tracking Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SO No, Customer PO, Customer, Project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PARTIALLY_DISPATCHED">Partially Dispatched</SelectItem>
                <SelectItem value="FULLY_DISPATCHED">Fully Dispatched</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              Loading tracking data...
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">SO No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Customer PO</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[120px]">Pipeline</TableHead>
                    <TableHead className="min-w-[160px]">Completion</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => router.push(`/po-tracking/${order.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {order.soNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{order.customerName}</div>
                          {order.projectName && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {order.projectName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {order.customerPoNo || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.soDate), "dd MMM yy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[order.status] || "bg-gray-500"} text-xs`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <MiniPipeline stages={order.stages} />
                      </TableCell>
                      <TableCell>
                        <CompletionBar percentage={order.completionPercentage} />
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
