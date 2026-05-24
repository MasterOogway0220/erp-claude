"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// Logic for this page now lives in ProcessStep (src/components/order-wizard/ProcessStep.tsx),
// rendered as step 1 of the wizard at /sales/[id].
// This route is kept to avoid 404s on existing links; it redirects to the wizard.

export default function OrderProcessingRedirect({
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
