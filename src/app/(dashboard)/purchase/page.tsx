"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function PurchasePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase"
        description="Manage purchase requisitions and purchase orders"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
