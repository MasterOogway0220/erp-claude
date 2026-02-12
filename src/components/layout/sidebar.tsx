"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  Mail,
  X,
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
      { title: "Company", href: "/masters/company", roles: ["ADMIN"] },
      { title: "Employees", href: "/masters/employees" },
      { title: "Buyers", href: "/masters/buyers" },
      { title: "Customers", href: "/masters/customers" },
      { title: "Vendors", href: "/masters/vendors" },
      { title: "Product Specifications", href: "/masters/products" },
      { title: "Pipe Sizes", href: "/masters/pipe-sizes" },
      { title: "Units (UOM)", href: "/masters/units" },
      { title: "Material Codes", href: "/masters/material-codes" },
      { title: "Testing Types", href: "/masters/testing" },
      { title: "Financial Years", href: "/masters/financial-years", roles: ["ADMIN"] },
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
      { title: "MTC Repository", href: "/quality" },
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
      { title: "Buyer Performance", href: "/reports/buyer-performance" },
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
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore();

  const userRole = user?.role;

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return userRole && item.roles.includes(userRole);
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <span className="text-lg font-bold text-primary">ERP</span>
        )}
        {/* Desktop: collapse toggle, Mobile: close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden md:flex"
          onClick={toggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
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
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "relative hidden md:flex flex-col border-r bg-background transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="fixed inset-y-0 left-0 w-64 flex flex-col bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
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

  const [isOpen, setIsOpen] = useState(!!isActive);

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

  // Group with children — collapsed sidebar: show tooltip flyout
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
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

  // Group with children — expanded sidebar: collapsible dropdown
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="ml-4 space-y-0.5 border-l pl-4 py-1">
          {item.children?.map((child) => (
            <Link
              key={child.title}
              href={child.href}
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith(child.href)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
