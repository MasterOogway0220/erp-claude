"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardCheck,
  Truck,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

const summaryCards = [
  {
    title: "Open Enquiries",
    value: "0",
    description: "Pending response",
    icon: <FileText className="h-5 w-5 text-blue-500" />,
  },
  {
    title: "Active Quotations",
    value: "0",
    description: "In pipeline",
    icon: <FileText className="h-5 w-5 text-green-500" />,
  },
  {
    title: "Sales Orders",
    value: "0",
    description: "Open orders",
    icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
  },
  {
    title: "Purchase Orders",
    value: "0",
    description: "Pending delivery",
    icon: <Package className="h-5 w-5 text-orange-500" />,
  },
  {
    title: "Inventory Items",
    value: "0",
    description: "Total stock entries",
    icon: <Warehouse className="h-5 w-5 text-teal-500" />,
  },
  {
    title: "Pending Inspections",
    value: "0",
    description: "Awaiting QC",
    icon: <ClipboardCheck className="h-5 w-5 text-yellow-500" />,
  },
  {
    title: "Dispatches (MTD)",
    value: "0",
    description: "This month",
    icon: <Truck className="h-5 w-5 text-indigo-500" />,
  },
  {
    title: "Open NCRs",
    value: "0",
    description: "Non-conformances",
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
  },
];

export default function DashboardPage() {
  const { user } = useCurrentUser();

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
    </div>
  );
}
