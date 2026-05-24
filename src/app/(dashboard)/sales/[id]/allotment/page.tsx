"use client";

// This page has been folded into the Order Processing wizard (Phase 4).
// All allotment logic now lives in src/components/order-wizard/AllotmentStep.tsx.
// Old deep-links are redirected to the wizard so no external URL breaks.

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllotmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/sales/${id}`);
  }, [id, router]);

  return null;
}
