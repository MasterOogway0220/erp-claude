"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function DispatchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch & Finance"
        description="Packing lists, dispatch notes, invoices, and payments"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
