"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MastersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/masters/employees");
  }, [router]);
  return null;
}
