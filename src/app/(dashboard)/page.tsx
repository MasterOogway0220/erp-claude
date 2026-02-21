"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  IndianRupee,
  Plus,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  ReceiptText,
  PackageCheck,
  Search,
  ScrollText,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [metrics, setMetrics] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/reports/management-review");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "—";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Hero metric cards (top row - 4 large)
  const heroCards = [
    {
      title: "Open SO Value",
      value: formatCurrency(metrics?.salesMetrics?.openSOValue),
      description: "Total value of open sales orders",
      icon: <IndianRupee className="h-6 w-6 text-emerald-600" />,
      bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
      borderAccent: "border-l-emerald-500",
    },
    {
      title: "Active Quotations",
      value: metrics?.salesMetrics?.quotationCount ?? "0",
      description: "Quotations currently in pipeline",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-100 dark:bg-blue-900/40",
      borderAccent: "border-l-blue-500",
    },
    {
      title: "Purchase Orders",
      value: metrics?.salesMetrics?.poCount ?? "0",
      description: "Orders pending vendor delivery",
      icon: <Package className="h-6 w-6 text-orange-600" />,
      bgColor: "bg-orange-100 dark:bg-orange-900/40",
      borderAccent: "border-l-orange-500",
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(metrics?.financialMetrics?.outstandingReceivables),
      description: "Total unpaid invoice amount",
      icon: <ReceiptText className="h-6 w-6 text-amber-600" />,
      bgColor: "bg-amber-100 dark:bg-amber-900/40",
      borderAccent: "border-l-amber-500",
    },
  ];

  // Compact metric cards (bottom rows - 8 smaller)
  const compactCards = [
    {
      title: "Open Enquiries",
      value: metrics?.salesMetrics?.enquiryCount ?? "0",
      icon: <Search className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Sales Orders",
      value: metrics?.salesMetrics?.orderCount ?? "0",
      icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
    },
    {
      title: "Inventory Items",
      value: metrics?.inventoryMetrics?.totalStock ?? "0",
      icon: <Warehouse className="h-5 w-5 text-teal-500" />,
    },
    {
      title: "Under Inspection",
      value: metrics?.inventoryMetrics?.underInspection ?? "0",
      icon: <ClipboardCheck className="h-5 w-5 text-yellow-500" />,
    },
    {
      title: "On-Time Delivery",
      value:
        metrics?.dispatchMetrics?.onTimeDeliveryPct != null
          ? `${metrics.dispatchMetrics.onTimeDeliveryPct}%`
          : "—",
      icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
    },
    {
      title: "Today's Dispatches",
      value: metrics?.dispatchMetrics?.todayDispatches ?? "0",
      icon: <Truck className="h-5 w-5 text-cyan-500" />,
    },
    {
      title: "Open NCRs",
      value: metrics?.qualityMetrics?.openNCRs ?? "0",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    },
    {
      title: "Accepted Stock",
      value:
        metrics?.inventoryMetrics?.acceptedTotalMtr != null
          ? `${Number(metrics.inventoryMetrics.acceptedTotalMtr).toFixed(1)} Mtr`
          : "—",
      icon: <PackageCheck className="h-5 w-5 text-violet-500" />,
    },
  ];

  const quickActions = [
    {
      label: "New Enquiry",
      href: "/enquiries/create",
      icon: <Search className="h-4 w-4" />,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      label: "Create Quotation",
      href: "/quotations/create",
      icon: <ScrollText className="h-4 w-4" />,
      color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      label: "New GRN",
      href: "/inventory/grn/create",
      icon: <Package className="h-4 w-4" />,
      color: "bg-orange-600 hover:bg-orange-700 text-white",
    },
    {
      label: "New Inspection",
      href: "/quality/inspections/create",
      icon: <ClipboardCheck className="h-4 w-4" />,
      color: "bg-purple-600 hover:bg-purple-700 text-white",
    },
  ];

  // Quick stats for the summary bar
  const quickStats = [
    { label: "Enquiries", value: metrics?.salesMetrics?.enquiryCount ?? "—" },
    { label: "Quotations", value: metrics?.salesMetrics?.quotationCount ?? "—" },
    { label: "Orders", value: metrics?.salesMetrics?.orderCount ?? "—" },
    { label: "Stock Items", value: metrics?.inventoryMetrics?.totalStock ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome Section */}
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100/60 dark:from-slate-900/50 dark:to-slate-800/30 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting()}, {user?.name ?? "User"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{formattedDate}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>{formattedTime}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {quickStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroCards.map((card) => (
          <Card
            key={card.title}
            className={`border-l-4 ${card.borderAccent} transition-shadow hover:shadow-md`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.bgColor}`}
                >
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {compactCards.map((card) => (
          <Card
            key={card.title}
            className="transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {card.title}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${action.color}`}
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {metrics?.lowStockAlerts?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Low Stock Alerts
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Items below minimum threshold
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="destructive" className="tabular-nums">
                {metrics.lowStockAlerts.length} items
              </Badge>
              <Link
                href="/inventory/stock"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-0">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-9 text-xs font-semibold">
                      Product
                    </TableHead>
                    <TableHead className="h-9 text-xs font-semibold">
                      Size
                    </TableHead>
                    <TableHead className="h-9 text-right text-xs font-semibold">
                      Available (Mtr)
                    </TableHead>
                    <TableHead className="h-9 text-right text-xs font-semibold">
                      Stock Entries
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.lowStockAlerts.map((alert: any, i: number) => (
                    <TableRow key={i} className="h-10">
                      <TableCell className="py-2 font-medium text-sm">
                        {alert.product || "—"}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                        {alert.sizeLabel || "—"}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            alert.availableQty < 10
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              : alert.availableQty < 50
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {alert.availableQty.toFixed(3)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right tabular-nums text-sm">
                        {alert.pieces}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
