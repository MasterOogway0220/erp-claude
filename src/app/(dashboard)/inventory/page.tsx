"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock management, GRN entry, and locations"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
