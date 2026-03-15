"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  ClipboardCheck,
  FlaskConical,
  Truck,
  Warehouse,
  CheckCheck,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  relatedModule: string | null;
  relatedId: string | null;
  dueDate: string | null;
  assignedToRole: string | null;
  createdAt: string;
  isDynamic?: boolean;
}

interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unread: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  CRITICAL: {
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
  },
  HIGH: {
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  },
  MEDIUM: {
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: <Info className="h-5 w-5 text-yellow-500" />,
  },
  LOW: {
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  INSPECTION_DUE: <ClipboardCheck className="h-5 w-5" />,
  LAB_TESTING_PENDING: <FlaskConical className="h-5 w-5" />,
  DELIVERY_DEADLINE: <Truck className="h-5 w-5" />,
  MATERIAL_PREPARATION: <Warehouse className="h-5 w-5" />,
};

const TYPE_LABELS: Record<string, string> = {
  INSPECTION_DUE: "Inspection Due",
  LAB_TESTING_PENDING: "Lab Testing Pending",
  DELIVERY_DEADLINE: "Delivery Deadline",
  MATERIAL_PREPARATION: "Material Preparation",
};

const MODULE_ROUTES: Record<string, string> = {
  warehouse: "/warehouse/intimation",
  inventory: "/inventory/stock",
  quality: "/quality/lab-letters",
  sales: "/sales",
};

const SEVERITY_BADGE_VARIANT: Record<string, string> = {
  CRITICAL: "bg-red-500 text-white hover:bg-red-600",
  HIGH: "bg-orange-500 text-white hover:bg-orange-600",
  MEDIUM: "bg-yellow-500 text-white hover:bg-yellow-600",
  LOW: "bg-blue-500 text-white hover:bg-blue-600",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, unread: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterSeverity !== "all") params.set("severity", filterSeverity);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
      setSummary(data.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0, unread: 0 });
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterType, filterSeverity, filterStatus]);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      });
      if (!res.ok) throw new Error();
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "READ" } : a)));
      toast.success("Alert marked as read");
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });
      if (!res.ok) throw new Error();
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert dismissed");
    } catch {
      toast.error("Failed to dismiss alert");
    }
  };

  const getModuleLink = (alert: Alert): string | null => {
    if (!alert.relatedModule || !alert.relatedId) return null;
    const base = MODULE_ROUTES[alert.relatedModule];
    if (!base) return null;
    return `${base}/${alert.relatedId}`;
  };

  // Group alerts by severity for display
  const groupedAlerts = {
    CRITICAL: alerts.filter((a) => a.severity === "CRITICAL"),
    HIGH: alerts.filter((a) => a.severity === "HIGH"),
    MEDIUM: alerts.filter((a) => a.severity === "MEDIUM"),
    LOW: alerts.filter((a) => a.severity === "LOW"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notifications"
        description="Monitor inspection due dates, lab testing status, and delivery deadlines"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{summary.high}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/30 p-2">
                <Info className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{summary.low}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.unread}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Type:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INSPECTION_DUE">Inspection Due</SelectItem>
                  <SelectItem value="LAB_TESTING_PENDING">Lab Testing Pending</SelectItem>
                  <SelectItem value="DELIVERY_DEADLINE">Delivery Deadline</SelectItem>
                  <SelectItem value="MATERIAL_PREPARATION">Material Preparation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Severity:</span>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="UNREAD">Unread</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAlerts} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Cards grouped by severity */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading alerts...
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No alerts found</p>
            <p className="text-sm">All systems are operating normally.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedAlerts).map(([severity, severityAlerts]) => {
          if (severityAlerts.length === 0) return null;
          const config = SEVERITY_CONFIG[severity];
          return (
            <div key={severity} className="space-y-3">
              <div className="flex items-center gap-2">
                {config?.icon}
                <h3 className={`text-sm font-semibold uppercase tracking-wide ${config?.color}`}>
                  {severity} ({severityAlerts.length})
                </h3>
              </div>
              <div className="grid gap-3">
                {severityAlerts.map((alert) => {
                  const sevConfig = SEVERITY_CONFIG[alert.severity];
                  const moduleLink = getModuleLink(alert);
                  return (
                    <Card
                      key={alert.id}
                      className={`${sevConfig?.borderColor} ${alert.status === "READ" ? "opacity-70" : ""}`}
                    >
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-start gap-4">
                          {/* Type icon */}
                          <div className={`rounded-lg p-2.5 shrink-0 ${sevConfig?.bgColor}`}>
                            {TYPE_ICONS[alert.type] || <Bell className="h-5 w-5" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm">{alert.title}</h4>
                              <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE_VARIANT[alert.severity]}`}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {TYPE_LABELS[alert.type] || alert.type}
                              </Badge>
                              {alert.status === "READ" && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Read
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                              {alert.dueDate && (
                                <span>Due: {format(new Date(alert.dueDate), "dd MMM yyyy")}</span>
                              )}
                              {alert.assignedToRole && (
                                <span>Role: {alert.assignedToRole}</span>
                              )}
                              <span>{format(new Date(alert.createdAt), "dd MMM yyyy HH:mm")}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {moduleLink && (
                              <Link href={moduleLink}>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  View
                                </Button>
                              </Link>
                            )}
                            {alert.status === "UNREAD" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                onClick={() => handleMarkRead(alert.id)}
                                title="Mark as read"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => handleDismiss(alert.id)}
                              title="Dismiss"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
