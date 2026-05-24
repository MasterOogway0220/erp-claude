"use client";

/**
 * This route is retired — its logic now lives in ReviewStep
 * (src/components/order-wizard/ReviewStep.tsx) inside the wizard shell at
 * sales/[id]/page.tsx.
 *
 * Deep links to /sales/[id]/review are redirected into the wizard (step 0 = Review).
 */

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/page-loading";

export default function CustomerPOReviewRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params?.id as string | undefined;
    if (id) {
      router.replace(`/sales/${id}`);
    } else {
      router.replace("/sales");
    }
  }, [params, router]);

  return <PageLoading />;
}
