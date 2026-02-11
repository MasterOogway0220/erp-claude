"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function QualityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Inspections, MTC repository, NCR register, and lab letters"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
