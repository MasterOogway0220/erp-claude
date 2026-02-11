"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";

export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user as
      | { id: string; email: string; name: string; role: UserRole }
      | undefined,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
