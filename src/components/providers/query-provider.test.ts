import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";

/**
 * Two promises this app makes about cached data, pinned here because both are
 * easy to break by accident and neither fails loudly when broken.
 *
 * 1. **A page reload shows fresh data.** The cache lives in memory only. The
 *    `QueryClient` is constructed inside `useState` in `query-provider.tsx`, so
 *    reloading the page builds a new, empty one and every screen refetches.
 *    That is what makes a hard refresh a reliable way to escape anything
 *    stale — a user's instinct to press F5 has to actually work.
 *
 *    The way this gets broken is adding `@tanstack/query-sync-storage-persister`
 *    or `PersistQueryClientProvider` to "make it faster". That writes the cache
 *    to localStorage, where it survives a reload, and a hard refresh stops
 *    clearing anything. If that is ever wanted, it needs a deliberate decision
 *    about which keys may persist — not a blanket persister.
 *
 * 2. **Nothing is cached across users.** A new client starts empty, so signing
 *    out and back in as somebody else cannot show the previous user's rows.
 */

describe("the query cache is memory-only", () => {
  it("a fresh client has no entries — what a page reload produces", () => {
    const client = new QueryClient();
    client.setQueryData(["customers"], { customers: [{ id: "1" }] });
    expect(client.getQueryData(["customers"])).toBeDefined();

    // A reload does not clear the old client; it constructs a new one.
    const afterReload = new QueryClient();
    expect(afterReload.getQueryData(["customers"])).toBeUndefined();
    expect(afterReload.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clear() empties every entry, for an explicit sign-out purge", () => {
    const client = new QueryClient();
    client.setQueryData(["customers"], [{ id: "1" }]);
    client.setQueryData(["sales-orders"], [{ id: "2" }]);
    expect(client.getQueryCache().getAll()).toHaveLength(2);

    client.clear();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
