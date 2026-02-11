"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Database,
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardCheck,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Users,
  Building2,
  FlaskConical,
  MoreHorizontal,
  FilePlus,
  List,
  ClipboardList,
  FileCheck,
  MapPin,
  Receipt,
  BookOpen,
  TestTube,
  FileWarning,
  Mail,
  CreditCard,
  Shield,
  ScrollText,
  Cog,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  children?: { title: string; href: string; roles?: UserRole[] }[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Masters",
    icon: <Database className="h-5 w-5" />,
    roles: ["ADMIN", "SALES", "PURCHASE"],
    children: [
      { title: "Product Specifications", href: "/masters/products" },
      { title: "Pipe Sizes", href: "/masters/pipe-sizes" },
      { title: "Customers", href: "/masters/customers" },
      { title: "Vendors", href: "/masters/vendors" },
      { title: "Testing Types", href: "/masters/testing" },
      { title: "Other Masters", href: "/masters/other" },
    ],
  },
  {
    title: "Enquiries",
    icon: <Mail className="h-5 w-5" />,
    roles: ["SALES", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Enquiry List", href: "/enquiries" },
      { title: "Create Enquiry", href: "/enquiries/create" },
    ],
  },
  {
    title: "Quotations",
    icon: <FileText className="h-5 w-5" />,
    roles: ["SALES", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Quotation List", href: "/quotations" },
      { title: "Create Quotation", href: "/quotations/create" },
    ],
  },
  {
    title: "Sales",
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ["SALES", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Sales Orders", href: "/sales" },
      { title: "Customer PO Review", href: "/sales" },
    ],
  },
  {
    title: "Purchase",
    icon: <Package className="h-5 w-5" />,
    roles: ["PURCHASE", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Purchase Requisitions", href: "/purchase" },
      { title: "Purchase Orders", href: "/purchase" },
      { title: "Vendor Tracking", href: "/purchase" },
    ],
  },
  {
    title: "Inventory",
    icon: <Warehouse className="h-5 w-5" />,
    roles: ["STORES", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Stock View", href: "/inventory" },
      { title: "New GRN", href: "/inventory/grn/create" },
    ],
  },
  {
    title: "Quality",
    icon: <ClipboardCheck className="h-5 w-5" />,
    roles: ["QC", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Inspections", href: "/quality" },
      { title: "New Inspection", href: "/quality/inspections/create" },
      { title: "NCR Register", href: "/quality" },
      { title: "Lab Letters", href: "/quality/lab-letters/create" },
    ],
  },
  {
    title: "Dispatch & Finance",
    icon: <Truck className="h-5 w-5" />,
    roles: ["STORES", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
    children: [
      { title: "Packing Lists", href: "/dispatch" },
      { title: "Dispatch Notes", href: "/dispatch/dispatch-notes/create" },
      { title: "Invoices", href: "/dispatch/invoices/create" },
      { title: "Payments", href: "/dispatch/payments/create" },
    ],
  },
  {
    title: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["MANAGEMENT", "ADMIN"],
    children: [
      { title: "All Reports", href: "/reports" },
      { title: "Sales Dashboard", href: "/reports/sales" },
      { title: "Inventory", href: "/reports/inventory" },
      { title: "Vendor Performance", href: "/reports/vendor-performance" },
      { title: "Management Review", href: "/reports/management-review" },
    ],
  },
  {
    title: "Admin",
    icon: <Settings className="h-5 w-5" />,
    roles: ["ADMIN"],
    children: [
      { title: "User Management", href: "/admin" },
      { title: "Traceability", href: "/admin/traceability" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { isCollapsed, toggle } = useSidebarStore();

  const userRole = user?.role;

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return userRole && item.roles.includes(userRole);
  });

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <span className="text-lg font-bold text-primary">NPS ERP</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {filteredNavigation.map((item) => (
            <NavGroup
              key={item.title}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

function NavGroup({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
}) {
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((child) => pathname.startsWith(child.href));

  if (item.href) {
    // Simple link (Dashboard)
    const content = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
          isCollapsed && "justify-center px-2"
        )}
      >
        {item.icon}
        {!isCollapsed && <span>{item.title}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  }

  // Group with children
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            {item.icon}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <p className="font-semibold">{item.title}</p>
          {item.children?.map((child) => (
            <Link
              key={child.title}
              href={child.href}
              className="text-xs hover:underline"
            >
              {child.title}
            </Link>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {item.icon}
        <span>{item.title}</span>
      </div>
      <div className="ml-6 space-y-1">
        {item.children?.map((child) => (
          <Link
            key={child.title}
            href={child.href}
            className={cn(
              "block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname.startsWith(child.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            {child.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
