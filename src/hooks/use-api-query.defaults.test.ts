import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, retryUnauthorizedOnce } from "./use-api-query";

/**
 * These pin the two things that silently switched the cache off once already.
 *
 * `useApiQuery` builds the object it hands to `useQuery`. React Query merges
 * that over the provider's defaults with a plain object spread, and a key that
 * is *present* with the value `undefined` still wins a spread. So writing
 * `staleTime: options.staleTime` unconditionally — which the first version did
 * — replaced the provider's 60s default with `undefined`, which React Query
 * reads as 0. Every screen that did not pass its own staleTime refetched on
 * every mount: the whole caching effort, quietly undone, with nothing failing
 * and no test catching it.
 *
 * The same spread also reset `retry` from the provider's deliberate 1 back to
 * the library default of 3 — three rounds of connection attempts against a
 * database whose firewall bans connection churn.
 */

/** Mirrors the provider's defaults in `components/providers/query-provider.tsx`. */
function clientWithDefaults() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  });
}

describe("provider defaults survive the options spread", () => {
  it("an omitted option falls through to the provider default", () => {
    const resolved = clientWithDefaults().defaultQueryOptions({
      queryKey: ["omitted"],
    } as never);
    expect(resolved.staleTime).toBe(60_000);
    expect(resolved.retry).toBe(1);
  });

  it("a key present as undefined CLOBBERS the default — the trap", () => {
    // Not a wish: this documents React Query's actual merge behaviour, which
    // is why `useApiQuery` must omit unset keys rather than pass undefined.
    const resolved = clientWithDefaults().defaultQueryOptions({
      queryKey: ["explicit-undefined"],
      staleTime: undefined,
      retry: undefined,
    } as never);
    expect(resolved.staleTime).toBeUndefined();
    expect(resolved.retry).toBeUndefined();
  });

  it("the conditional spread useApiQuery uses keeps the defaults", () => {
    // The exact shape of the spread in useApiQuery, with nothing supplied.
    const options: { staleTime?: number; enabled?: boolean; retry?: number } = {};
    const built = {
      queryKey: ["conditional"],
      ...(options.staleTime !== undefined && { staleTime: options.staleTime }),
      ...(options.enabled !== undefined && { enabled: options.enabled }),
      ...(options.retry !== undefined && { retry: options.retry }),
    };
    expect("staleTime" in built).toBe(false);
    const resolved = clientWithDefaults().defaultQueryOptions(built as never);
    expect(resolved.staleTime).toBe(60_000);
    expect(resolved.retry).toBe(1);
  });

  it("a supplied option still overrides the default", () => {
    const options = { staleTime: 600_000 };
    const built = {
      queryKey: ["supplied"],
      ...(options.staleTime !== undefined && { staleTime: options.staleTime }),
    };
    const resolved = clientWithDefaults().defaultQueryOptions(built as never);
    expect(resolved.staleTime).toBe(600_000);
  });
});

describe("retryUnauthorizedOnce", () => {
  // React Query passes 0 the first time it asks, so `< 1` is one retry.
  const unauthorized = new ApiError(401, "Request failed (401)");

  it("retries the first 401 and no more", () => {
    expect(retryUnauthorizedOnce(0, unauthorized)).toBe(true);
    expect(retryUnauthorizedOnce(1, unauthorized)).toBe(false);
    expect(retryUnauthorizedOnce(2, unauthorized)).toBe(false);
  });

  it("does not retry any other status", () => {
    // A 500 from a database outage must surface immediately rather than
    // generate more connection attempts.
    expect(retryUnauthorizedOnce(0, new ApiError(500, "boom"))).toBe(false);
    expect(retryUnauthorizedOnce(0, new Error("network"))).toBe(false);
  });
});
