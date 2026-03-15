"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

const labelMap: Record<string, string> = {
  // Top-level modules
  alerts: "Alerts & Notifications",
  "client-purchase-orders": "Client P.O. Register",
  masters: "Masters",
  quotations: "Quotations",
  sales: "Sales Orders",
  purchase: "Purchase",
  inventory: "Inventory",
  quality: "Quality",
  dispatch: "Dispatch & Finance",
  reports: "Reports",
  admin: "Admin",
  superadmin: "Master Control",
  // Masters sub-pages
  products: "Product Specifications",
  sizes: "Sizes",
  lengths: "Lengths",
  customers: "Customers",
  vendors: "Vendors",
  buyers: "Buyers",
  warehouses: "Warehouses",
  employees: "Employees",
  units: "Units (UOM)",
  "material-codes": "Material Codes",
  testing: "Testing Types",
  "payment-terms": "Payment Terms",
  "delivery-terms": "Delivery Terms",
  tax: "Tax Rates",
  "inspection-agencies": "Inspection Agencies",
  other: "Other Masters",
  company: "Company",
  // Actions
  create: "Create",
  standard: "Standard",
  nonstandard: "Non-Standard",
  compare: "Compare",
  review: "Customer PO Review",
  "reserve-stock": "Reserve Stock",
  "po-tracking": "Order Tracking",
  // Purchase sub-pages
  requisitions: "Requisitions",
  orders: "Orders",
  "follow-up": "Vendor Tracking",
  // Quality sub-pages
  inspections: "Inspections",
  "qc-release": "QC Release",
  "lab-letters": "Lab Letters",
  mtc: "MTC Repository",
  ncr: "NCR Register",
  requirements: "Quality Requirements",
  "inspection-offers": "Inspection Offers",
  "lab-reports": "Lab Reports",
  // Dispatch sub-pages
  "dispatch-notes": "Dispatch Notes",
  "packing-lists": "Packing Lists",
  invoices: "Invoices",
  "credit-notes": "Credit Notes",
  "debit-notes": "Debit Notes",
  payments: "Payments",
  "bank-reconciliation": "Bank Reconciliation",
  // Inventory sub-pages
  grn: "GRN",
  stock: "Stock",
  "stock-issue": "Stock Issue",
  "heat-lifecycle": "Heat Lifecycle",
  // Warehouse sub-pages
  warehouse: "Warehouse",
  intimation: "Intimation",
  // Reports sub-pages
  "buyer-performance": "Buyer Performance",
  "vendor-performance": "Vendor Performance",
  "management-review": "Management Review",
  "quotation-analysis": "Quotation Analysis",
  "customer-ageing": "Customer Ageing",
  "inventory-ageing": "Inventory Ageing",
  "ncr-analysis": "NCR Analysis",
  "on-time-delivery": "On-Time Delivery",
  "client-status": "Client Status Report",
  // PO Acceptance
  "po-acceptance": "P.O. Acceptance",
  "customer-contacts": "Customer Contacts",
  dossier: "Dispatch Dossier",
  // Admin sub-pages
  traceability: "Traceability",
};

// Check if a segment looks like a dynamic ID (CUID, UUID, or numeric)
function isDynamicId(segment: string): boolean {
  // CUID (starts with c, 25 chars)
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true;
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  // Numeric ID
  if (/^\d+$/.test(segment)) return true;
  return false;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-0 text-xs text-muted-foreground mb-1">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        let label: string;
        if (isDynamicId(segment)) {
          label = "Detail";
        } else {
          label =
            labelMap[segment] ||
            segment
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
        }

        return (
          <span key={href} className="flex items-center gap-0">
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
