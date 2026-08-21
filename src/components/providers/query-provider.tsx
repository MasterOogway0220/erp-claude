"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            // Was "always", which overrode staleTime entirely: every route
            // navigation refetched every query from scratch, so the 60s
            // staleTime above was declaring an intent the config then ignored.
            // `true` honours it — a screen revisited within a minute renders
            // from cache instantly instead of waiting on the network. Fewer
            // queries and a faster UI are the same change here.
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
