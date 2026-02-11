"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function OtherPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Other Masters"
        description="Tax, Currency, UOM, Payment Terms, Delivery Terms, and more"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
