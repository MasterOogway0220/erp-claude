"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
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

  const summaryCards = [
    {
      title: "Open Enquiries",
      value: metrics?.salesMetrics?.enquiryCount ?? "0",
      description: "Pending response",
      icon: <FileText className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Active Quotations",
      value: metrics?.salesMetrics?.quotationCount ?? "0",
      description: "In pipeline",
      icon: <FileText className="h-5 w-5 text-green-500" />,
    },
    {
      title: "Sales Orders",
      value: metrics?.salesMetrics?.orderCount ?? "0",
      description: "Open orders",
      icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
    },
    {
      title: "Open SO Value",
      value: formatCurrency(metrics?.salesMetrics?.openSOValue),
      description: "Total open SO value",
      icon: <IndianRupee className="h-5 w-5 text-emerald-500" />,
    },
    {
      title: "Purchase Orders",
      value: metrics?.salesMetrics?.poCount ?? "0",
      description: "Pending delivery",
      icon: <Package className="h-5 w-5 text-orange-500" />,
    },
    {
      title: "Inventory Items",
      value: metrics?.inventoryMetrics?.totalStock ?? "0",
      description: "Total stock entries",
      icon: <Warehouse className="h-5 w-5 text-teal-500" />,
    },
    {
      title: "Under Inspection",
      value: metrics?.inventoryMetrics?.underInspection ?? "0",
      description: "Awaiting QC",
      icon: <ClipboardCheck className="h-5 w-5 text-yellow-500" />,
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(metrics?.financialMetrics?.outstandingReceivables),
      description: "Unpaid invoices",
      icon: <IndianRupee className="h-5 w-5 text-amber-500" />,
    },
    {
      title: "On-Time Delivery",
      value: metrics?.dispatchMetrics?.onTimeDeliveryPct != null
        ? `${metrics.dispatchMetrics.onTimeDeliveryPct}%`
        : "—",
      description: "Dispatch performance",
      icon: <Truck className="h-5 w-5 text-indigo-500" />,
    },
    {
      title: "Today's Dispatches",
      value: metrics?.dispatchMetrics?.todayDispatches ?? "0",
      description: "Dispatched today",
      icon: <Truck className="h-5 w-5 text-cyan-500" />,
    },
    {
      title: "Open NCRs",
      value: metrics?.qualityMetrics?.openNCRs ?? "0",
      description: "Non-conformances",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    },
    {
      title: "Accepted Stock",
      value: metrics?.inventoryMetrics?.acceptedTotalMtr != null
        ? `${Number(metrics.inventoryMetrics.acceptedTotalMtr).toFixed(1)} Mtr`
        : "—",
      description: `${metrics?.inventoryMetrics?.accepted ?? 0} entries accepted`,
      icon: <Warehouse className="h-5 w-5 text-violet-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name ?? "User"}`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {metrics?.lowStockAlerts?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            <Badge variant="destructive">{metrics.lowStockAlerts.length} items</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Available (Mtr)</TableHead>
                  <TableHead className="text-right">Stock Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.lowStockAlerts.map((alert: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{alert.product || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{alert.sizeLabel || "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className={alert.availableQty < 10 ? "text-red-600 font-semibold" : "text-orange-600"}>
                        {alert.availableQty.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{alert.pieces}</TableCell>
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
