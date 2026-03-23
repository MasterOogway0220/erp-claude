"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, AlertTriangle, Clock, CheckCircle2, Package, Truck } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface IntimationItem {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  sizeLabel: string | null;
  requiredQty: number;
  preparedQty: number;
  inspectionStatus: string;
  testingStatus: string;
  itemStatus: string;
  heatNo: string | null;
}

interface Intimation {
  id: string;
  mprNo: string;
  mprDate: string;
  priority: string;
  requiredByDate: string | null;
  status: string;
  remarks: string | null;
  salesOrder: {
    id: string;
    soNo: string;
    status: string;
    customerPoNo: string | null;
    customer: { id: string; name: string; city: string | null };
  };
  warehouse: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  items: IntimationItem[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon: any }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: Package },
  MATERIAL_READY: { label: "Material Ready", variant: "outline", icon: CheckCircle2 },
  DISPATCHED: { label: "Dispatched", variant: "default", icon: Truck },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: AlertTriangle },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  NORMAL: { label: "Normal", className: "bg-slate-100 text-slate-700" },
  URGENT: { label: "Urgent", className: "bg-amber-100 text-amber-800" },
  CRITICAL: { label: "Critical", className: "bg-red-100 text-red-800" },
};

const CHECK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "text-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", className: "text-blue-600" },
  COMPLETED: { label: "Done", className: "text-green-600 font-medium" },
  NA: { label: "N/A", className: "text-muted-foreground/60" },
};

const ITEM_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  PREPARING: { label: "Preparing", variant: "default" },
  READY: { label: "Ready", variant: "outline" },
  ISSUED: { label: "Issued", variant: "default" },
};

export default function WarehouseIntimationPage() {
  const router = useRouter();
  const [intimations, setIntimations] = useState<Intimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntimations();
  }, [search, statusFilter, priorityFilter]);

  const fetchIntimations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);

      const res = await fetch(`/api/warehouse/intimation?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIntimations(data.intimations || []);
      }
    } catch (error) {
      console.error("Failed to fetch intimations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const stats = {
    total: intimations.length,
    pending: intimations.filter((i) => i.status === "PENDING").length,
    inProgress: intimations.filter((i) => i.status === "IN_PROGRESS").length,
    ready: intimations.filter((i) => i.status === "MATERIAL_READY").length,
    critical: intimations.filter((i) => i.priority === "CRITICAL" && i.status !== "DISPATCHED" && i.status !== "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Intimation"
        description="Material Preparation Requests — prepare and track material against Sales Orders"
      >
        <Button onClick={() => router.push("/warehouse/intimation/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New MPR
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total MPRs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <div className="text-xs text-muted-foreground">Material Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by MPR No, SO No, Customer, PO No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="MATERIAL_READY">Material Ready</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <PageLoading />
          ) : intimations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No material preparation requests found.
            </div>
          ) : (
            <div className="space-y-3">
              {intimations.map((mpr) => {
                const statusCfg = STATUS_CONFIG[mpr.status] || STATUS_CONFIG.PENDING;
                const priorityCfg = PRIORITY_CONFIG[mpr.priority] || PRIORITY_CONFIG.NORMAL;
                const isExpanded = expandedId === mpr.id;
                const readyCount = mpr.items.filter((i) => i.itemStatus === "READY" || i.itemStatus === "ISSUED").length;

                return (
                  <Card
                    key={mpr.id}
                    className={
                      mpr.priority === "CRITICAL" && mpr.status !== "DISPATCHED" && mpr.status !== "CANCELLED"
                        ? "border-red-200 bg-red-50/30"
                        : mpr.priority === "URGENT" && mpr.status !== "DISPATCHED" && mpr.status !== "CANCELLED"
                        ? "border-amber-200 bg-amber-50/20"
                        : ""
                    }
                  >
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-2">
                        <button
                          className="font-semibold text-sm hover:text-primary transition-colors"
                          onClick={() => router.push(`/warehouse/intimation/${mpr.id}`)}
                        >
                          {mpr.mprNo}
                        </button>
                        <Badge variant={statusCfg.variant as any}>
                          {statusCfg.label}
                        </Badge>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityCfg.className}`}>
                          {priorityCfg.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          SO: <span className="font-medium text-foreground">{mpr.salesOrder.soNo}</span>
                        </span>
                        {mpr.salesOrder.customerPoNo && (
                          <span className="text-sm text-muted-foreground">
                            PO: <span className="font-medium text-foreground">{mpr.salesOrder.customerPoNo}</span>
                          </span>
                        )}
                        <span className="text-sm">
                          {mpr.salesOrder.customer.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(mpr.mprDate), "dd/MM/yyyy")}
                          {mpr.requiredByDate && (
                            <> | Due: <span className="font-medium">{format(new Date(mpr.requiredByDate), "dd/MM/yyyy")}</span></>
                          )}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${mpr.items.length > 0 ? (readyCount / mpr.items.length) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {readyCount}/{mpr.items.length} items ready
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setExpandedId(isExpanded ? null : mpr.id)}
                        >
                          {isExpanded ? "Hide Items" : "Show Items"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => router.push(`/warehouse/intimation/${mpr.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Expanded Items Table */}
                      {isExpanded && (
                        <div className="mt-3 border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Material</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead className="text-right">Req. Qty</TableHead>
                                <TableHead className="text-right">Prepared</TableHead>
                                <TableHead>Inspection</TableHead>
                                <TableHead>Testing</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mpr.items.map((item) => {
                                const inspCfg = CHECK_STATUS_CONFIG[item.inspectionStatus] || CHECK_STATUS_CONFIG.PENDING;
                                const testCfg = CHECK_STATUS_CONFIG[item.testingStatus] || CHECK_STATUS_CONFIG.PENDING;
                                const itemCfg = ITEM_STATUS_CONFIG[item.itemStatus] || ITEM_STATUS_CONFIG.PENDING;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-muted-foreground">{item.sNo}</TableCell>
                                    <TableCell className="font-medium">{item.product || "\u2014"}</TableCell>
                                    <TableCell>{item.material || "\u2014"}</TableCell>
                                    <TableCell>{item.sizeLabel || "\u2014"}</TableCell>
                                    <TableCell className="text-right">{Number(item.requiredQty).toFixed(3)}</TableCell>
                                    <TableCell className="text-right">{Number(item.preparedQty).toFixed(3)}</TableCell>
                                    <TableCell>
                                      <span className={`text-xs ${inspCfg.className}`}>{inspCfg.label}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`text-xs ${testCfg.className}`}>{testCfg.label}</span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={itemCfg.variant as any} className="text-xs">
                                        {itemCfg.label}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
