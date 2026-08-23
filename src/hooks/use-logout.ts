"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";

/**
 * Signs the user out and drops everything cached about them.
 *
 * Sessions run for 30 idle days and, in day-to-day use, end here (see
 * `session.maxAge` in `src/lib/auth.ts`) — so this is the one moment the app
 * can be sure the person in front of the screen is finished. On a shared
 * machine — a stores or warehouse terminal — the next person must not be able
 * to see the previous user's rows, and those rows include customer pricing and
 * margins.
 *
 * Today `signOut({ callbackUrl })` sets `window.location.href`, a full page
 * navigation, which throws away the in-memory `QueryClient` on its own. The
 * explicit `clear()` is not redundant insurance against that being *wrong*; it
 * is insurance against it being *changed*. Passing `redirect: false` to get a
 * smoother sign-out is an obvious future tidy-up, and it would silently leave
 * the entire cache populated across a user switch. Clearing first means that
 * change stays safe.
 *
 * Order matters: clear before navigating, because after the navigation starts
 * there is no guarantee more code runs.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.clear();
    signOut({ callbackUrl: "/login" });
  }, [queryClient]);
}
