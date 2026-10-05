"use client";

import type { ComponentType, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { PageLoading } from "@/components/shared/page-loading";

/**
 * Sandbox preview for pages and components: the sandbox login renders the new
 * version, every other user the unchanged one. Nothing renders until the
 * session is known, so a real user never sees the new version flash.
 */
export function sandboxSwitch<P extends object>(
  Next: ComponentType<P>,
  Legacy: ComponentType<P>,
  fallback: ReactNode = <PageLoading />
) {
  function SandboxPreviewSwitch(props: P) {
    const { data: session, status } = useSession();
    if (status === "loading") return <>{fallback}</>;
    return session?.user?.isSandbox ? <Next {...props} /> : <Legacy {...props} />;
  }
  return SandboxPreviewSwitch;
}
