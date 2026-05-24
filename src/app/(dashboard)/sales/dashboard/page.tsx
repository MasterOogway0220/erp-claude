"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Phase 1: Dashboard stats folded into the Orders list page (/sales).
 * This route is kept so old links don't 404 — it immediately redirects.
 */
export default function SalesDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Redirecting to Orders…
    </div>
  );
}
