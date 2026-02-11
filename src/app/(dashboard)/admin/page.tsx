"use client";

import { PageHeader } from "@/components/shared/page-header";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="User management, audit log, and system settings"
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Module under development. Coming in Phase X.
      </div>
    </div>
  );
}
