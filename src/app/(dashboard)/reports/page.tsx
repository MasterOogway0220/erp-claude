"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  BarChart3,
  FileText,
  Warehouse,
  Clock,
  Users,
  UserCheck,
  AlertTriangle,
  Truck,
  ClipboardList,
} from "lucide-react";

const reportCards = [
  {
    title: "Sales Dashboard",
    description: "Revenue trends, order pipeline, and monthly sales analysis",
    href: "/reports/sales",
    icon: BarChart3,
    color: "text-blue-500",
  },
  {
    title: "Quotation Analysis",
    description: "Conversion rates, response times, and quotation funnel metrics",
    href: "/reports/quotation-analysis",
    icon: FileText,
    color: "text-indigo-500",
  },
  {
    title: "Inventory Dashboard",
    description: "Stock summary by status, product-wise and material-wise breakdown",
    href: "/reports/inventory",
    icon: Warehouse,
    color: "text-green-500",
  },
  {
    title: "Inventory Ageing",
    description: "Ageing buckets, slow-moving items, and stock rotation analysis",
    href: "/reports/inventory-ageing",
    icon: Clock,
    color: "text-yellow-500",
  },
  {
    title: "Vendor Performance",
    description: "Scorecards with on-time delivery, rejection rates, and NCR counts",
    href: "/reports/vendor-performance",
    icon: UserCheck,
    color: "text-purple-500",
  },
  {
    title: "Customer Ageing",
    description: "Outstanding amounts by customer with 30/60/90/91+ day buckets",
    href: "/reports/customer-ageing",
    icon: Users,
    color: "text-orange-500",
  },
  {
    title: "NCR Analysis",
    description: "Non-conformance trends by vendor, type, and monthly frequency",
    href: "/reports/ncr-analysis",
    icon: AlertTriangle,
    color: "text-red-500",
  },
  {
    title: "On-Time Delivery",
    description: "OTD percentage, average delays, and late delivery tracking",
    href: "/reports/on-time-delivery",
    icon: Truck,
    color: "text-teal-500",
  },
  {
    title: "Management Review",
    description: "Combined KPIs across sales, inventory, quality, dispatch, and finance",
    href: "/reports/management-review",
    icon: ClipboardList,
    color: "text-gray-700",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & MIS"
        description="Dashboards, analytics, and management information system"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className={`rounded-lg bg-muted p-2 ${report.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
