import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The risk in server-side caching is not staleness, it is serving one caller
 * another caller's rows.
 *
 * The browser cache is per browser, so a mistake there shows a user their own
 * wrong data. This cache is shared by everyone on the deployment, so a key that
 * omits `companyId` shows company A the customer list of company B — a
 * multi-tenant leak, from a caching change, with nothing failing.
 *
 * These tests drive `cachedMasterRead` against a stubbed `unstable_cache` and
 * assert on the key it builds, because that key is the entire safety boundary.
 */

const calls: { keyParts: string[]; options: { tags?: string[]; revalidate?: number } }[] = [];
const revalidated: string[] = [];
const profiles: unknown[] = [];

vi.mock("next/cache", () => ({
  // Mirrors the real signature: returns a function that, when called, runs the
  // wrapped read. Recording keyParts is what the assertions below inspect.
  unstable_cache: (
    fn: () => unknown,
    keyParts: string[],
    options: { tags?: string[]; revalidate?: number }
  ) => {
    calls.push({ keyParts, options });
    return fn;
  },
  // Next 16's signature takes a cache-life profile as well as the tag.
  revalidateTag: (tag: string, profile: unknown) => {
    revalidated.push(tag);
    profiles.push(profile);
  },
}));

const { cachedMasterRead, invalidateMasters, MASTER_TTL_SECONDS } = await import(
  "./master-cache"
);

beforeEach(() => {
  calls.length = 0;
  revalidated.length = 0;
  profiles.length = 0;
});

describe("cachedMasterRead scopes every entry to a company", () => {
  it("puts the companyId in the key", async () => {
    await cachedMasterRead({
      tag: "customers",
      companyId: "company-a",
      read: async () => ["a"],
    });
    expect(calls[0].keyParts).toContain("company-a");
  });

  it("gives two companies different keys for the same list", async () => {
    await cachedMasterRead({ tag: "customers", companyId: "company-a", read: async () => ["a"] });
    await cachedMasterRead({ tag: "customers", companyId: "company-b", read: async () => ["b"] });

    const [a, b] = calls.map((c) => c.keyParts.join("|"));
    expect(a).not.toBe(b);
  });

  it("does not let an unscoped read share a real company's entry", async () => {
    // companyId null means "not company-scoped" — a different result set from
    // any real company's, so it must not collide with one.
    await cachedMasterRead({ tag: "customers", companyId: null, read: async () => [] });
    await cachedMasterRead({ tag: "customers", companyId: "company-a", read: async () => [] });

    const [unscoped, scoped] = calls.map((c) => c.keyParts.join("|"));
    expect(unscoped).not.toBe(scoped);
  });

  it("separates entries by the caller's extra key values", async () => {
    // includeInactive changes the rows returned, so it must change the key.
    await cachedMasterRead({
      tag: "customers", companyId: "company-a", key: [true], read: async () => [],
    });
    await cachedMasterRead({
      tag: "customers", companyId: "company-a", key: [false], read: async () => [],
    });

    const [withInactive, withoutInactive] = calls.map((c) => c.keyParts.join("|"));
    expect(withInactive).not.toBe(withoutInactive);
  });

  it("separates entries by tag, so two lists never collide", async () => {
    await cachedMasterRead({ tag: "customers", companyId: "company-a", read: async () => [] });
    await cachedMasterRead({ tag: "vendors", companyId: "company-a", read: async () => [] });

    const [customers, vendors] = calls.map((c) => c.keyParts.join("|"));
    expect(customers).not.toBe(vendors);
  });
});

describe("cache options", () => {
  it("tags the entry with its list so a write can drop it", async () => {
    await cachedMasterRead({ tag: "vendors", companyId: "c", read: async () => [] });
    expect(calls[0].options.tags).toEqual(["vendors"]);
  });

  it("applies the five-minute backstop by default", async () => {
    await cachedMasterRead({ tag: "vendors", companyId: "c", read: async () => [] });
    expect(calls[0].options.revalidate).toBe(MASTER_TTL_SECONDS);
  });

  it("returns whatever the read returned", async () => {
    const rows = [{ id: "1", name: "Larsen & Toubro" }];
    const out = await cachedMasterRead({
      tag: "customers", companyId: "c", read: async () => rows,
    });
    expect(out).toBe(rows);
  });
});

describe("invalidateMasters", () => {
  it("revalidates each tag it is given", () => {
    invalidateMasters("customers", "buyers");
    expect(revalidated).toEqual(["customers", "buyers"]);
  });

  it("purges with the same window the entries were written with", () => {
    // Next 16 requires a cache-life profile. If it drifted from the TTL the
    // entries are written with, the purge and the backstop would disagree.
    invalidateMasters("customers");
    expect(profiles).toEqual([{ expire: MASTER_TTL_SECONDS }]);
  });

  it("is a no-op when given nothing", () => {
    invalidateMasters();
    expect(revalidated).toEqual([]);
  });
});
