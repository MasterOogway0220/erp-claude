"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Manage sales orders and customer PO tracking"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
