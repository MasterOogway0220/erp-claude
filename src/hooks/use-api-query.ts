"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

/**
 * The one way this app reads from its own API.
 *
 * Nearly every dashboard screen used to hold the same twelve lines: a
 * `useState` for the rows, another for a loading flag, a `useEffect` that
 * called an async `fetchX`, and a `try/catch` that swallowed the error. That
 * shape has no cache, so every visit — including pressing Back — refetched
 * from scratch and hit the database again.
 *
 * Routing those reads through React Query instead buys four things the manual
 * version cannot have without writing them by hand:
 *
 *  - **A cache.** Revisiting a screen renders immediately from memory and
 *    revalidates behind the scenes (see `query-provider.tsx` for the windows).
 *  - **Deduplication.** Three components asking for the same key in the same
 *    tick produce one request, not three.
 *  - **No spinner flash on paging.** `placeholderData` keeps the previous
 *    result on screen while the next loads.
 *  - **Fewer database queries.** Which matters here beyond speed: the database
 *    is shared hosting with a 75-connection cap, so suppressed requests are
 *    the cheapest possible fix for connection pressure.
 *
 * Usage mirrors the manual version closely enough that converting a screen is
 * mechanical:
 *
 *     const { data, isLoading } = useApiQuery<{ stocks: Stock[] }>(
 *       ["inventory-stock", statusFilter, page],
 *       `/api/inventory/stock?${params}`
 *     );
 *     const stocks = data?.stocks ?? [];
 */

/**
 * An API failure. Carries the HTTP status so callers can branch on it —
 * notably to retry a 401, which happens on first paint when a screen loads
 * before the session cookie has been established.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Throws on a non-2xx so React Query treats it as an error, not as data. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    // Surface the API's own message when it sends one — the routes in this
    // app answer `{ error: "..." }` and that text is usually the useful part.
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.error === "string" ? `: ${body.error}` : "";
    } catch {
      // Non-JSON error body; the status alone will have to do.
    }
    throw new ApiError(res.status, `Request failed (${res.status})${detail}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Retry a 401 once. A screen mounting before the session cookie is readable
 * gets one 401 that resolves itself; anything else is a real failure and is
 * surfaced immediately rather than retried against a struggling database.
 *
 * `failureCount` is 0 the first time this is asked, so `< 1` is exactly one
 * retry — two attempts in total. `< 2` would be two retries, which is three
 * requests at a moment when the database may already be refusing connections.
 */
export function retryUnauthorizedOnce(failureCount: number, error: unknown) {
  return error instanceof ApiError && error.status === 401 && failureCount < 1;
}

export interface ApiQueryOptions {
  /**
   * Override the 60s default. Reference data that changes rarely — masters,
   * dropdown sources — should pass a much longer window; there is no reason to
   * re-read the size master every minute.
   */
  staleTime?: number;
  /** Skip the request entirely, e.g. while an id is still undefined. */
  enabled?: boolean;
  /** Override the client default of one retry. */
  retry?: number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * `key` must include every value the URL depends on. React Query caches by
 * key, so a filter or page number left out of the key will serve the wrong
 * rows from cache — that is the one way to get this wrong.
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  url: string,
  options: ApiQueryOptions = {}
) {
  return useQuery({
    queryKey: key,
    queryFn: () => fetchJson<T>(url),
    // Only the options actually supplied are spread in. React Query merges
    // options over the provider's defaults with a plain object spread, and a
    // key present with the value `undefined` still wins that spread — so
    // writing `staleTime: options.staleTime` unconditionally overwrote the
    // provider's 60s default with `undefined`, which React Query reads as 0.
    // Every caller that did not pass its own staleTime was therefore
    // refetching on each mount, i.e. not caching at all. Same for `retry`,
    // which fell back to the library default of 3 rather than the 1 the
    // provider sets to avoid hammering a database that bans connection churn.
    ...(options.staleTime !== undefined && { staleTime: options.staleTime }),
    ...(options.enabled !== undefined && { enabled: options.enabled }),
    ...(options.retry !== undefined && { retry: options.retry }),
  });
}

/** Master/reference data: cached for 10 minutes rather than the 60s default. */
export const REFERENCE_STALE_TIME = 10 * 60 * 1000;

export function useReferenceQuery<T>(
  key: readonly unknown[],
  url: string,
  options: Omit<ApiQueryOptions, "staleTime"> = {}
) {
  return useApiQuery<T>(key, url, {
    ...options,
    staleTime: REFERENCE_STALE_TIME,
  });
}

/**
 * Delays a value so a search box does not put every keystroke into a cache key.
 *
 * The screens that debounced before did it around the *fetch*; debouncing the
 * value instead is what React Query needs, because the key is what decides
 * whether a request happens at all. Typing "ABC" produces one cached entry
 * rather than three.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Drops cached results so the next read refetches — call after a write.
 *
 * Passing a key prefix invalidates every query beneath it: `invalidate(["products"])`
 * clears `["products", search, page]` for every search and page, which is
 * almost always what you want after creating or deleting one.
 */
export function useInvalidate() {
  const queryClient = useQueryClient();
  return useCallback(
    (...keys: readonly unknown[][]) => {
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient]
  );
}
