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
  Bell,
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
  moduleKey?: string;
  moduleKeys?: string[];
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
        title: "Alerts",
        href: "/alerts",
        icon: <Bell className="h-5 w-5" />,
        iconColorClass: "text-amber-500",
      },
      {
        title: "Masters",
        icon: <Database className="h-5 w-5" />,
        iconColorClass: "text-slate-500",
        roles: ["SUPER_ADMIN", "ADMIN", "SALES", "PURCHASE"],
        moduleKey: "masters",
        children: [
          { title: "Company", href: "/masters/company", roles: ["SUPER_ADMIN", "ADMIN"] },
          { title: "Employees", href: "/masters/employees" },
          { title: "Customer / Vendor", href: "/masters/customers" },
          { title: "Warehouses", href: "/masters/warehouses" },
          { title: "Products", href: "/masters/products" },
          { title: "Item / Material Codes", href: "/masters/material-codes" },
          { title: "Testing Types", href: "/masters/testing" },
          { title: "Terms & Conditions", href: "/masters/terms-conditions" },
          { title: "Offer Terms", href: "/masters/offer-terms" },
          { title: "Customer / Vendor Contacts", href: "/masters/customer-contacts" },
          { title: "Departments", href: "/masters/departments" },
          { title: "Industry Segments", href: "/masters/industry-segments" },
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
        roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "quotation",
        children: [
          { title: "Quotation List", href: "/quotations" },
          { title: "Create Quotation", href: "/quotations/create" },
        ],
      },
      {
        title: "Sales",
        icon: <ShoppingCart className="h-5 w-5" />,
        iconColorClass: "text-emerald-500",
        roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "sales",
        children: [
          { title: "Client P.O. Register", href: "/client-purchase-orders" },
          { title: "Register Client P.O.", href: "/client-purchase-orders/create" },
          { title: "P.O. Acceptance", href: "/po-acceptance" },
          { title: "Sales Orders", href: "/sales" },
          { title: "Order Tracking", href: "/po-tracking" },
          { title: "Customer PO Review", href: "/sales" },
        ],
      },
      {
        title: "Purchase",
        icon: <Package className="h-5 w-5" />,
        iconColorClass: "text-orange-500",
        roles: ["PURCHASE", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "purchase",
        children: [
          { title: "Dashboard", href: "/purchase/dashboard" },
          { title: "Purchase Requisitions", href: "/purchase" },
          { title: "Create PR", href: "/purchase/requisitions/create" },
          { title: "RFQ Management", href: "/purchase/rfq" },
          { title: "Comparative Statements", href: "/purchase/comparative-statement" },
          { title: "Purchase Orders", href: "/purchase/orders/create" },
          { title: "Vendor Tracking", href: "/purchase/follow-up" },
        ],
      },
      {
        title: "Inventory",
        icon: <Warehouse className="h-5 w-5" />,
        iconColorClass: "text-cyan-500",
        roles: ["STORES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "inventory",
        children: [
          { title: "Stock View", href: "/inventory" },
          { title: "New GRN", href: "/inventory/grn/create" },
          { title: "Stock Issue", href: "/inventory/stock-issue/create" },
          { title: "Warehouse Intimation", href: "/warehouse/intimation" },
        ],
      },
      {
        title: "Quality",
        icon: <ClipboardCheck className="h-5 w-5" />,
        iconColorClass: "text-violet-500",
        roles: ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "quality",
        children: [
          { title: "Inspections", href: "/quality" },
          { title: "New Inspection", href: "/quality/inspections/create" },
          { title: "QC Release", href: "/quality/qc-release/create" },
          { title: "MTC Repository", href: "/quality/mtc" },
          { title: "MTC Certificates", href: "/quality/mtc/certificates" },
          { title: "Create MTC", href: "/quality/mtc/certificates/create" },
          { title: "Material Spec Master", href: "/quality/mtc/material-specs" },
          { title: "NCR Register", href: "/quality/ncr" },
          { title: "Lab Letters", href: "/quality/lab-letters/create" },
          { title: "Lab Reports", href: "/quality/lab-reports" },
          { title: "Inspection Offers", href: "/quality/inspection-offers" },
          { title: "Quality Requirements", href: "/quality/requirements" },
        ],
      },
      {
        title: "Dispatch & Finance",
        icon: <Truck className="h-5 w-5" />,
        iconColorClass: "text-rose-500",
        roles: ["STORES", "ACCOUNTS", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKeys: ["dispatch", "finance"],
        children: [
          { title: "Packing Lists", href: "/dispatch" },
          { title: "Dispatch Notes", href: "/dispatch?tab=dispatch-notes" },
          { title: "Invoices", href: "/dispatch?tab=invoices" },
          { title: "Credit Notes", href: "/dispatch/credit-notes/create" },
          { title: "Debit Notes", href: "/dispatch/debit-notes/create" },
          { title: "Payments", href: "/dispatch?tab=payments" },
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
        roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
        moduleKey: "reports",
        children: [
          { title: "All Reports", href: "/reports" },
          { title: "Client Status Report", href: "/reports/client-status" },
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
        roles: ["SUPER_ADMIN", "ADMIN"],
        children: [
          { title: "Master Control", href: "/superadmin", roles: ["SUPER_ADMIN"] },
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
  userRole: UserRole | undefined,
  moduleAccess: string[] | undefined
): NavSection[] {
  const isAdminOrAbove = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const hasModuleFilter = moduleAccess && moduleAccess.length > 0;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Role check
        if (item.roles && !(userRole && item.roles.includes(userRole))) {
          return false;
        }
        // Module access check — SUPER_ADMIN and ADMIN see everything, items without moduleKey always show
        if (!isAdminOrAbove && hasModuleFilter) {
          const keys = item.moduleKeys || (item.moduleKey ? [item.moduleKey] : []);
          if (keys.length > 0) {
            return keys.some((k) => moduleAccess.includes(k));
          }
        }
        return true;
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
  const moduleAccess = user?.moduleAccess;
  const filteredSections = filterSections(navSections, userRole, moduleAccess);

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
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
      {!isCollapsed ? (
        <div className="flex items-center gap-3">
          <img src="/n-pipe-logo.jpg.jpeg" alt="N-Pipe Solutions" className="h-8" />
        </div>
      ) : (
        <div className="mx-auto flex h-8 w-8 items-center justify-center">
          <img src="/n-pipe-logo.jpg.jpeg" alt="NPS" className="h-8 w-8 object-contain" />
        </div>
      )}
      {/* Desktop: collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 shrink-0 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 hidden md:flex",
          isCollapsed && "hidden"
        )}
        onClick={toggle}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      {/* Collapsed expand */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mx-auto hidden md:flex text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 absolute right-1 top-4"
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
    <ScrollArea className="flex-1 relative [&_[data-radix-scroll-area-viewport]]:scrollbar-thin [&_[data-radix-scroll-area-viewport]]:scrollbar-track-transparent [&_[data-radix-scroll-area-viewport]]:scrollbar-thumb-border/40">
      <nav className={cn("py-3", isCollapsed ? "px-2" : "px-3")}>
        {filteredSections.map((section, sectionIdx) => (
          <div key={section.label} className={cn(sectionIdx > 0 && "mt-2")}>
            {/* Section label */}
            {!isCollapsed && (
              <div className={cn("mb-1 px-3", sectionIdx === 0 ? "pt-0" : "pt-3")}>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/50">
                  {section.label}
                </span>
              </div>
            )}
            {isCollapsed && sectionIdx > 0 && (
              <Separator className="my-3 mx-auto w-5 opacity-30" />
            )}

            {/* Items */}
            <div className="space-y-px">
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
    </ScrollArea>
  );

  // ------------------------------------------
  // User section (bottom)
  // ------------------------------------------
  const userSection = (
    <div className="shrink-0 border-t border-border/40">
      {!isCollapsed ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar size="sm">
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-none truncate text-foreground">
              {user?.name || "User"}
            </p>
            <Badge
              variant="secondary"
              className="mt-1.5 h-4 text-[9px] px-1.5 py-0 font-normal opacity-70"
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
          "relative hidden md:flex flex-col h-screen sticky top-0 border-r border-border/40 bg-background transition-[width] duration-200 ease-in-out",
          isCollapsed ? "w-[60px]" : "w-60"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200" />
          <aside
            className="fixed inset-y-0 left-0 w-60 flex flex-col bg-background shadow-xl animate-in slide-in-from-left duration-200 ease-out"
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
          "group relative flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors duration-150",
          "hover:bg-accent/60",
          isActive
            ? "bg-accent/50 text-foreground"
            : "text-muted-foreground hover:text-foreground",
          isCollapsed && "justify-center px-0 py-2 mx-auto w-10 h-10 rounded-md"
        )}
      >
        {/* Active left indicator */}
        {isActive && (
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary",
              isCollapsed && "h-3.5 w-[2px]"
            )}
          />
        )}
        <span className={cn(
          "shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]",
          isActive ? "text-primary" : item.iconColorClass
        )}>
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
              "relative flex items-center justify-center rounded-md py-2 mx-auto w-10 h-10 text-sm font-medium transition-colors duration-150 cursor-pointer",
              "hover:bg-accent/60",
              isActive
                ? "bg-accent/50 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-[2px] rounded-r-full bg-primary" />
            )}
            <span
              className={cn(
                "shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]",
                isActive ? "text-primary" : item.iconColorClass
              )}
            >
              {item.icon}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="flex flex-col gap-0.5 p-2 max-h-80 overflow-y-auto min-w-[160px]"
        >
          <p className="text-[11px] font-semibold text-foreground mb-1 px-1.5">
            {item.title}
          </p>
          {item.children?.map((child) => (
            <Link
              key={child.title}
              href={child.href}
              className={cn(
                "text-[11px] px-1.5 py-1 rounded transition-colors duration-150 hover:bg-accent/60 hover:text-foreground",
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
          "group relative flex w-full items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors duration-150",
          "hover:bg-accent/60",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary" />
        )}
        <span className={cn(
          "shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]",
          isActive ? "text-primary" : item.iconColorClass
        )}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Sub-items */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="ml-[21px] border-l border-border/40 space-y-px py-1 pl-3">
          {item.children?.map((child) => {
            const childActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.title}
                href={child.href}
                className={cn(
                  "group flex items-center rounded-md px-2 py-[5px] text-[12px] transition-colors duration-150",
                  "hover:bg-accent/50 hover:text-foreground",
                  childActive
                    ? "text-primary font-medium bg-accent/40"
                    : "text-muted-foreground"
                )}
              >
                <span className="truncate">{child.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
