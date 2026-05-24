"use client";

// This page has been folded into the Order Processing wizard (Phase 4).
// All reserve-stock logic now lives in src/components/order-wizard/AllotmentStep.tsx
// as the "Manual Stock Reservation" panel/dialog.
// Old deep-links are redirected to the wizard so no external URL breaks.

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ReserveStockPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      router.replace(`/sales/${params.id}`);
    }
  }, [params.id, router]);

  return null;
}
