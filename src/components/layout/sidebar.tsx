"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  X,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  iconColorClass?: string;
  roles?: UserRole[];
  children?: { title: string; href: string; roles?: UserRole[] }[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Navigation definition — grouped into labelled sections
// ---------------------------------------------------------------------------

const navSections: NavSection[] = [
  {
    label: "MAIN",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
        iconColorClass: "text-blue-500",
      },
      {
        title: "Masters",
        icon: <Database className="h-5 w-5" />,
        iconColorClass: "text-slate-500",
        roles: ["ADMIN", "SALES", "PURCHASE"],
        children: [
          { title: "Company", href: "/masters/company", roles: ["ADMIN"] },
          { title: "Employees", href: "/masters/employees" },
          { title: "Buyers", href: "/masters/buyers" },
          { title: "Customers", href: "/masters/customers" },
          { title: "Vendors", href: "/masters/vendors" },
          { title: "Warehouses", href: "/masters/warehouses" },
          { title: "Product Specifications", href: "/masters/products" },
          { title: "Pipe Sizes", href: "/masters/pipe-sizes" },
          { title: "Units (UOM)", href: "/masters/units" },
          { title: "Material Codes", href: "/masters/material-codes" },
          { title: "Testing Types", href: "/masters/testing" },
          { title: "Payment Terms", href: "/masters/payment-terms" },
          { title: "Delivery Terms", href: "/masters/delivery-terms" },
          { title: "Tax Rates", href: "/masters/tax" },
          { title: "Inspection Agencies", href: "/masters/inspection-agencies" },
          { title: "Financial Years", href: "/masters/financial-years", roles: ["ADMIN"] },
          { title: "Offer Terms", href: "/masters/offer-terms" },
          { title: "Other Masters", href: "/masters/other" },
        ],
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Quotations",
        icon: <FileText className="h-5 w-5" />,
        iconColorClass: "text-indigo-500",
        roles: ["SALES", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Quotation List", href: "/quotations" },
          { title: "Create Quotation", href: "/quotations/create" },
        ],
      },
      {
        title: "Sales",
        icon: <ShoppingCart className="h-5 w-5" />,
        iconColorClass: "text-emerald-500",
        roles: ["SALES", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Sales Orders", href: "/sales" },
          { title: "Customer PO Review", href: "/sales" },
        ],
      },
      {
        title: "Purchase",
        icon: <Package className="h-5 w-5" />,
        iconColorClass: "text-orange-500",
        roles: ["PURCHASE", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Purchase Requisitions", href: "/purchase" },
          { title: "Purchase Orders", href: "/purchase/orders/create" },
          { title: "Vendor Tracking", href: "/purchase/follow-up" },
        ],
      },
      {
        title: "Inventory",
        icon: <Warehouse className="h-5 w-5" />,
        iconColorClass: "text-cyan-500",
        roles: ["STORES", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Stock View", href: "/inventory" },
          { title: "New GRN", href: "/inventory/grn/create" },
          { title: "Stock Issue", href: "/inventory/stock-issue/create" },
        ],
      },
      {
        title: "Quality",
        icon: <ClipboardCheck className="h-5 w-5" />,
        iconColorClass: "text-violet-500",
        roles: ["QC", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Inspections", href: "/quality" },
          { title: "New Inspection", href: "/quality/inspections/create" },
          { title: "QC Release", href: "/quality/qc-release/create" },
          { title: "MTC Repository", href: "/quality/mtc" },
          { title: "NCR Register", href: "/quality/ncr" },
          { title: "Lab Letters", href: "/quality/lab-letters/create" },
        ],
      },
      {
        title: "Dispatch & Finance",
        icon: <Truck className="h-5 w-5" />,
        iconColorClass: "text-rose-500",
        roles: ["STORES", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
        children: [
          { title: "Packing Lists", href: "/dispatch" },
          { title: "Dispatch Notes", href: "/dispatch/dispatch-notes/create" },
          { title: "Invoices", href: "/dispatch/invoices/create" },
          { title: "Credit Notes", href: "/dispatch/credit-notes/create" },
          { title: "Debit Notes", href: "/dispatch/debit-notes/create" },
          { title: "Payments", href: "/dispatch/payments/create" },
          { title: "Bank Reconciliation", href: "/dispatch/bank-reconciliation" },
        ],
      },
    ],
  },
  {
    label: "REPORTS & ADMIN",
    items: [
      {
        title: "Reports",
        icon: <BarChart3 className="h-5 w-5" />,
        iconColorClass: "text-teal-500",
        roles: ["MANAGEMENT", "ADMIN"],
        children: [
          { title: "All Reports", href: "/reports" },
          { title: "Sales Dashboard", href: "/reports/sales" },
          { title: "Quotation Analysis", href: "/reports/quotation-analysis" },
          { title: "Buyer Performance", href: "/reports/buyer-performance" },
          { title: "Inventory", href: "/reports/inventory" },
          { title: "Inventory Ageing", href: "/reports/inventory-ageing" },
          { title: "Customer Ageing", href: "/reports/customer-ageing" },
          { title: "Vendor Performance", href: "/reports/vendor-performance" },
          { title: "NCR Analysis", href: "/reports/ncr-analysis" },
          { title: "On-Time Delivery", href: "/reports/on-time-delivery" },
          { title: "Management Review", href: "/reports/management-review" },
        ],
      },
      {
        title: "Admin",
        icon: <Settings className="h-5 w-5" />,
        iconColorClass: "text-gray-500",
        roles: ["ADMIN"],
        children: [
          { title: "User Management", href: "/admin" },
          { title: "Traceability", href: "/admin/traceability" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper: flatten all nav items for backward-compat role filtering
// ---------------------------------------------------------------------------

function filterSections(
  sections: NavSection[],
  userRole: UserRole | undefined
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return userRole && item.roles.includes(userRole);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

// ---------------------------------------------------------------------------
// Sidebar (main export)
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } =
    useSidebarStore();

  // Track which nav group is currently open (accordion behavior)
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const userRole = user?.role;
  const filteredSections = filterSections(navSections, userRole);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Initialize openGroup to whichever group contains the active route
  useEffect(() => {
    for (const section of filteredSections) {
      for (const item of section.items) {
        if (item.children?.some((child) => pathname.startsWith(child.href))) {
          setOpenGroup(item.title);
          return;
        }
      }
    }
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // ------------------------------------------
  // Brand header
  // ------------------------------------------
  const brandSection = (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4">
      {!isCollapsed ? (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-extrabold tracking-tight shadow-sm">
            NPS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none tracking-tight text-foreground">
              Piping Solutions
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Enterprise Resource Planning
            </span>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[10px] font-extrabold tracking-tight shadow-sm">
          NPS
        </div>
      )}
      {/* Desktop: collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hidden md:flex",
          isCollapsed && "hidden"
        )}
        onClick={toggle}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {/* Collapsed expand */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mx-auto hidden md:flex text-muted-foreground hover:text-foreground absolute right-1 top-4"
          onClick={toggle}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {/* Mobile close */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 md:hidden text-muted-foreground hover:text-foreground"
        onClick={() => setMobileOpen(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  // ------------------------------------------
  // Navigation content
  // ------------------------------------------
  const navigationContent = (
    <ScrollArea className="flex-1 relative">
      {/* Top fade */}
      <div className="pointer-events-none sticky top-0 z-10 h-3 bg-gradient-to-b from-background to-transparent" />
      <nav className={cn("px-3 pb-4", isCollapsed ? "px-2" : "px-3")}>
        {filteredSections.map((section, sectionIdx) => (
          <div key={section.label}>
            {/* Section label */}
            {!isCollapsed && (
              <div className="mb-1.5 mt-4 first:mt-1">
                <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.label}
                </span>
              </div>
            )}
            {isCollapsed && sectionIdx > 0 && (
              <Separator className="my-2 mx-auto w-6" />
            )}

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavGroup
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  isOpen={openGroup === item.title}
                  onToggle={(title) =>
                    setOpenGroup((prev) => (prev === title ? null : title))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {/* Bottom fade */}
      <div className="pointer-events-none sticky bottom-0 z-10 h-3 bg-gradient-to-t from-background to-transparent" />
    </ScrollArea>
  );

  // ------------------------------------------
  // User section (bottom)
  // ------------------------------------------
  const userSection = (
    <div className="shrink-0 border-t border-border/60">
      {!isCollapsed ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate text-foreground">
              {user?.name || "User"}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 h-4 text-[9px] px-1.5 py-0 font-medium"
            >
              {user?.role || "---"}
            </Badge>
          </div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );

  // ------------------------------------------
  // Combined sidebar content
  // ------------------------------------------
  const sidebarContent = (
    <>
      {brandSection}
      {navigationContent}
      {userSection}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col h-screen sticky top-0 border-r border-border/60 bg-background transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[60px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="fixed inset-y-0 left-0 w-64 flex flex-col bg-background shadow-2xl animate-in slide-in-from-left-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// NavGroup — handles both single-link and collapsible group items
// ---------------------------------------------------------------------------

function NavGroup({
  item,
  pathname,
  isCollapsed,
  isOpen,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: (title: string) => void;
}) {
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((child) => pathname.startsWith(child.href));

  // ------- Single link (e.g. Dashboard) -------
  if (item.href) {
    const content = (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          "hover:bg-accent/50 hover:text-accent-foreground",
          isActive
            ? "bg-primary/[0.08] text-primary font-semibold"
            : "text-muted-foreground",
          isCollapsed && "justify-center px-0 py-2.5 mx-auto w-10 h-10"
        )}
      >
        {/* Active left indicator */}
        {isActive && (
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary transition-all duration-200",
              isCollapsed && "left-0 h-4 w-[2px]"
            )}
          />
        )}
        <span className={cn(item.iconColorClass, isActive && "text-primary")}>
          {item.icon}
        </span>
        {!isCollapsed && <span>{item.title}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  }

  // ------- Collapsed: icon with tooltip flyout -------
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex items-center justify-center rounded-lg py-2.5 mx-auto w-10 h-10 text-sm font-medium transition-all duration-200 cursor-pointer",
              "hover:bg-accent/50 hover:text-accent-foreground",
              isActive
                ? "bg-primary/[0.08] text-primary"
                : "text-muted-foreground"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r-full bg-primary" />
            )}
            <span
              className={cn(item.iconColorClass, isActive && "text-primary")}
            >
              {item.icon}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="flex flex-col gap-1.5 p-3 max-h-80 overflow-y-auto"
        >
          <p className="text-xs font-semibold text-foreground mb-1">
            {item.title}
          </p>
          {item.children?.map((child) => (
            <Link
              key={child.title}
              href={child.href}
              className={cn(
                "text-xs py-0.5 transition-colors hover:text-foreground",
                pathname.startsWith(child.href)
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {child.title}
            </Link>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  }

  // ------- Expanded: collapsible dropdown -------
  return (
    <div>
      <button
        onClick={() => onToggle(item.title)}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          "hover:bg-accent/50 hover:text-accent-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary transition-all duration-200" />
        )}
        <span className={cn(item.iconColorClass, isActive && "text-primary")}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Sub-items */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="ml-[18px] space-y-0.5 py-1 pl-4">
          {item.children?.map((child) => {
            const childActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.title}
                href={child.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150",
                  "hover:bg-accent/50 hover:text-accent-foreground",
                  childActive
                    ? "text-primary font-medium bg-primary/[0.06]"
                    : "text-muted-foreground"
                )}
              >
                {/* Dot indicator */}
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-150",
                    childActive
                      ? "bg-primary"
                      : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                  )}
                />
                <span className="truncate">{child.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
