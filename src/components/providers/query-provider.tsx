"use client";

import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";

/**
 * The React Query cache for the whole dashboard.
 *
 * Every default here is chosen against one constraint: the database is
 * Hostinger shared MySQL with a hard 75-connection cap and a firewall that
 * bans connection churn. A query that does not run is the cheapest query
 * there is, so "render from cache" and "do not hammer a struggling database"
 * are the same decision — perceived speed and database load pull in the same
 * direction, not against each other.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // How long a result is served without a background refetch.
            // Reference data overrides this upward (see `useApiQuery`'s
            // `staleTime` argument and `useUnits`); transactional lists want
            // roughly a minute so a colleague's edit surfaces quickly.
            staleTime: 60 * 1000,

            // How long an *unused* result stays in memory before eviction.
            // This is what makes navigating back to a screen instant: the
            // page mounts, renders the cached rows immediately, and
            // revalidates behind the scenes. The library default is 5
            // minutes, which is shorter than a typical trip out to a detail
            // page and back, so the cache was being thrown away exactly when
            // it would have paid off.
            gcTime: 30 * 60 * 1000,

            refetchOnWindowFocus: false,

            // Was "always", which overrode staleTime entirely: every route
            // navigation refetched every query from scratch, so the 60s
            // staleTime above was declaring an intent the config then ignored.
            // `true` honours it — a screen revisited within a minute renders
            // from cache instantly instead of waiting on the network.
            refetchOnMount: true,

            // Paging or changing a filter changes the query key, which by
            // default blanks the data and shows a spinner. Keeping the
            // previous page on screen while the next one loads removes that
            // flash entirely — the single largest perceived-speed win on the
            // list screens, and it costs nothing.
            placeholderData: keepPreviousData,

            // The library default is three retries with backoff. When the
            // database is unreachable — the failure this application actually
            // suffers — that turns one failed screen into four rounds of
            // connection attempts against a server that is already banning us
            // for connection churn. One retry catches a genuine blip; more
            // than that makes an outage worse and delays the error the user
            // needs to see.
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
