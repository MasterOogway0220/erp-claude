"use client";

import { PageHeader } from "@/components/shared/page-header";
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
  ArrowRight,
  TrendingUp,
  Package,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

interface ReportItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accentColor: string;
  iconBg: string;
  iconColor: string;
}

interface ReportCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  reports: ReportItem[];
}

const reportCategories: ReportCategory[] = [
  {
    title: "Sales & Marketing",
    description: "Track revenue, quotations, and customer engagement",
    icon: TrendingUp,
    reports: [
      {
        title: "Sales Dashboard",
        description: "Revenue trends, order pipeline, and monthly sales analysis",
        href: "/reports/sales",
        icon: BarChart3,
        accentColor: "bg-blue-500",
        iconBg: "bg-blue-50 dark:bg-blue-950",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Quotation Analysis",
        description: "Conversion rates, response times, and quotation funnel metrics",
        href: "/reports/quotation-analysis",
        icon: FileText,
        accentColor: "bg-indigo-500",
        iconBg: "bg-indigo-50 dark:bg-indigo-950",
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
      {
        title: "Customer Ageing",
        description: "Outstanding amounts by customer with 30/60/90/91+ day buckets",
        href: "/reports/customer-ageing",
        icon: Users,
        accentColor: "bg-orange-500",
        iconBg: "bg-orange-50 dark:bg-orange-950",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
    ],
  },
  {
    title: "Inventory & Supply Chain",
    description: "Monitor stock levels, ageing, and vendor performance",
    icon: Package,
    reports: [
      {
        title: "Inventory Dashboard",
        description: "Stock summary by status, product-wise and material-wise breakdown",
        href: "/reports/inventory",
        icon: Warehouse,
        accentColor: "bg-emerald-500",
        iconBg: "bg-emerald-50 dark:bg-emerald-950",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Inventory Ageing",
        description: "Ageing buckets, slow-moving items, and stock rotation analysis",
        href: "/reports/inventory-ageing",
        icon: Clock,
        accentColor: "bg-yellow-500",
        iconBg: "bg-yellow-50 dark:bg-yellow-950",
        iconColor: "text-yellow-600 dark:text-yellow-400",
      },
      {
        title: "Vendor Performance",
        description: "Scorecards with on-time delivery, rejection rates, and NCR counts",
        href: "/reports/vendor-performance",
        icon: UserCheck,
        accentColor: "bg-purple-500",
        iconBg: "bg-purple-50 dark:bg-purple-950",
        iconColor: "text-purple-600 dark:text-purple-400",
      },
      {
        title: "On-Time Delivery",
        description: "OTD percentage, average delays, and late delivery tracking",
        href: "/reports/on-time-delivery",
        icon: Truck,
        accentColor: "bg-teal-500",
        iconBg: "bg-teal-50 dark:bg-teal-950",
        iconColor: "text-teal-600 dark:text-teal-400",
      },
    ],
  },
  {
    title: "Quality",
    description: "Non-conformance tracking and quality metrics",
    icon: ShieldCheck,
    reports: [
      {
        title: "NCR Analysis",
        description: "Non-conformance trends by vendor, type, and monthly frequency",
        href: "/reports/ncr-analysis",
        icon: AlertTriangle,
        accentColor: "bg-red-500",
        iconBg: "bg-red-50 dark:bg-red-950",
        iconColor: "text-red-600 dark:text-red-400",
      },
    ],
  },
  {
    title: "Management",
    description: "Executive dashboards and cross-functional KPIs",
    icon: DollarSign,
    reports: [
      {
        title: "Management Review",
        description: "Combined KPIs across sales, inventory, quality, dispatch, and finance",
        href: "/reports/management-review",
        icon: ClipboardList,
        accentColor: "bg-slate-600",
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconColor: "text-slate-600 dark:text-slate-300",
      },
    ],
  },
];

function ReportCard({ report }: { report: ReportItem }) {
  const Icon = report.icon;
  return (
    <Link href={report.href} className="group block">
      <div className="relative flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80 overflow-hidden">
        {/* Left accent bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${report.accentColor} rounded-l-xl`}
        />

        {/* Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${report.iconBg} ml-1`}
        >
          <Icon className={`h-5 w-5 ${report.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground/90">
              {report.title}
            </h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {report.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & MIS"
        description="Dashboards, analytics, and management information system"
      />

      {reportCategories.map((category) => {
        const CategoryIcon = category.icon;
        return (
          <section key={category.title} className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{category.title}</h2>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </div>

            {/* Report Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.reports.map((report) => (
                <ReportCard key={report.href} report={report} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
