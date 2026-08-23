import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Server-side caching for the master lists.
 *
 * The browser cache added in `use-api-query.ts` is per browser: ten people
 * opening the customer list is ten database queries. This one is shared by
 * everyone hitting the same deployment, so those ten become one for as long as
 * the entry lives. That difference is the whole point — it is a multiplier
 * across users rather than a saving per user, and the database it protects is
 * shared hosting with a hard 75-connection cap and a firewall that bans
 * connection churn.
 *
 * It is deliberately limited to *master* data: customers, vendors, warehouses,
 * agencies, departments, units, item codes and the terms tables. Those are read
 * on nearly every screen and changed a few times a week. Transactional data —
 * quotations, orders, stock, dispatches — is not cached here, because a user
 * must see their own write immediately and a stale order list is a support
 * call.
 *
 * ## The rule that matters
 *
 * **Everything the query varies by must be in the key.** A value the read
 * closure uses but the key omits means one caller is served another's rows.
 * For `companyId` that is not a stale-data bug, it is one company seeing
 * another company's customers — which is why it is a required parameter of
 * `cachedMasterRead` rather than something you remember to add to `key`.
 *
 * Auth is unaffected: this is called *after* `checkAccess`, so every request
 * is still authorised individually. Only the database result is cached.
 */

/**
 * The cache tags in use. One per master list, so a write to that list can drop
 * exactly its own entries and nothing else.
 */
export const MASTER_TAGS = [
  "customers",
  "vendors",
  "warehouses",
  "inspection-agencies",
  "departments",
  "units",
  "material-codes",
  "buyers",
  "employees",
  "payment-terms",
  "delivery-terms",
  "tax-rates",
] as const;

export type MasterTag = (typeof MASTER_TAGS)[number];

/**
 * Five minutes. Long enough that a screen-to-screen journey costs one query
 * instead of a dozen, short enough that a master edited by a colleague appears
 * without anyone hunting for a refresh button — and writes invalidate their own
 * tag immediately anyway, so this is only the backstop for an edit made outside
 * the app (a direct SQL fix, another deployment).
 */
export const MASTER_TTL_SECONDS = 5 * 60;

/**
 * Reads a master list through the shared server cache.
 *
 * ```ts
 * const customers = await cachedMasterRead({
 *   tag: "customers",
 *   companyId,                     // required: scopes the entry
 *   key: [includeInactive],        // every other value the read varies by
 *   read: () => prisma.customerMaster.findMany({ where, ... }),
 * });
 * ```
 *
 * `read` must be a pure function of `companyId` and `key`. If it closes over
 * anything else that changes — a search term, a filter, a date — that value
 * belongs in `key` or the caller must not use this at all.
 */
export async function cachedMasterRead<T>({
  tag,
  companyId,
  key = [],
  ttlSeconds = MASTER_TTL_SECONDS,
  read,
}: {
  tag: MasterTag;
  /** Required. Omitting it from the key would cross company boundaries. */
  companyId: string | null | undefined;
  /** Every other value `read` varies by. */
  key?: readonly (string | number | boolean | null | undefined)[];
  ttlSeconds?: number;
  read: () => Promise<T>;
}): Promise<T> {
  // A null companyId means "not company-scoped" for this deployment, which is
  // a different result set from any real company's — so it gets its own slot
  // rather than sharing one.
  const scope = companyId ?? "__unscoped__";

  const cached = unstable_cache(read, [tag, scope, ...key.map(String)], {
    tags: [tag],
    revalidate: ttlSeconds,
  });

  return cached();
}

/**
 * Drops every cached entry for these lists. Call after any write that changes
 * them, in the same request that made the change.
 *
 * Invalidation is by tag, so it clears that list for *every* company and every
 * key variant at once. That is intentional: it is one list per tag, writes are
 * rare, and being right is worth more than being surgical here.
 */
export function invalidateMasters(...tags: MasterTag[]): void {
  for (const tag of tags) {
    // Next 16 requires a cache-life profile alongside the tag. It is given as
    // the same window the entries were written with, so the purge and the
    // backstop describe one policy rather than two that can drift apart.
    revalidateTag(tag, { expire: MASTER_TTL_SECONDS });
  }
}
