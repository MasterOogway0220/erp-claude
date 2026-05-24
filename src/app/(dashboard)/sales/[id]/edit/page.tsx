"use client";

/**
 * This route is retired — its logic now lives in ReviewStep
 * (src/components/order-wizard/ReviewStep.tsx) inside the wizard shell at
 * sales/[id]/page.tsx.  The inline "Edit Order" button within ReviewStep
 * surfaces the edit form without leaving the wizard.
 *
 * Deep links to /sales/[id]/edit are redirected into the wizard (step 0 = Review).
 */

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/page-loading";

export default function EditSalesOrderRedirectPage() {
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
