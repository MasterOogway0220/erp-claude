# Sales PRD — Plan 01: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundational FX rate library and unit test harness that all subsequent Sales PRD phases depend on.

**Architecture:** Wrap the free frankfurter.app API in a small module (`src/lib/fx/get-rate.ts`) with a per-day in-memory cache and fallback to the most recent cached rate on API failure. Add vitest as the pure-function unit test harness.

**Tech Stack:** TypeScript · Vitest · native `fetch` · frankfurter.app (no API key)

---

## Spec patch — schema discoveries

The design spec at `docs/superpowers/specs/2026-05-23-sales-module-prd-design.md` references `Customer.isInternational` and a new `Currency` enum. These are **not needed** — the existing schema already covers them:

| Spec said | Reality |
|---|---|
| Add `Customer.isInternational Boolean` | Use existing `CustomerMaster.customerType String` (`"DOMESTIC"` / `"INTERNATIONAL"`) |
| Add `Customer.defaultCurrency Currency` | Use existing `CustomerMaster.defaultCurrency String` (already there) |
| Add `enum Currency { INR USD }` | Use existing `CurrencyMaster` table (USD already seeded in `prisma/seed.ts`) |
| Add UI toggle on customer form | Already exists at `src/app/(dashboard)/masters/customers/create/page.tsx:436-447` |

**Translation:** the customer-side international wiring is **already shipped**. Foundation only needs the FX rate library + test harness. Update the spec inline at the end of this plan via Task 6.

---

## File structure

```
package.json                        ← MODIFY: add vitest deps + "test" script
vitest.config.ts                    ← CREATE: test config
src/lib/fx/
  get-rate.ts                       ← CREATE: FX rate lookup with daily cache
  get-rate.test.ts                  ← CREATE: tests for all 4 cases + same-currency
docs/superpowers/specs/
  2026-05-23-sales-module-prd-design.md   ← MODIFY: patch §3.1 + §3.3 to reference existing fields
```

---

## Task 1: Add vitest to the project

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest as a dev dependency**

Run:
```bash
npm install --save-dev vitest@^2.1.0 @vitest/coverage-v8@^2.1.0 --cache /tmp/npm-cache-temp
```

Expected: adds `vitest` + `@vitest/coverage-v8` under `devDependencies` in `package.json`. (The `--cache` flag works around the known npm root-owned cache issue noted in project memory.)

- [ ] **Step 2: Add the `test` script to package.json**

Modify the `"scripts"` block in `package.json` to add a `test` entry:

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "seed:prod": "tsx prisma/seed-production.ts"
}
```

- [ ] **Step 3: Create vitest.config.ts**

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run:
```bash
npm test
```

Expected: vitest starts, reports "No test files found" (or runs zero tests cleanly). Exit code 0 if vitest treats no-tests as success; otherwise non-zero — that's fine for this step as long as vitest itself launches without import errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "$(cat <<'EOF'
chore: add vitest test harness

Adds vitest + coverage as dev deps and a vitest.config.ts pointed at
src/**/*.test.ts. npm test and npm run test:watch are now wired up.
Foundation prerequisite for the Sales PRD FX library tests.
EOF
)"
```

---

## Task 2: Write the FX rate tests — test first

**Files:**
- Create: `src/lib/fx/get-rate.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/lib/fx/get-rate.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getRate, _clearCacheForTests, _setTodayForTests } from "./get-rate";

const FRANKFURTER = "https://api.frankfurter.app/latest";

function mockFetchOk(rate: number) {
  return vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ rates: { INR: rate } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }) as Response,
  );
}

function mockFetchFail() {
  return vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
}

describe("getRate", () => {
  beforeEach(() => {
    _clearCacheForTests();
    _setTodayForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _setTodayForTests(null);
  });

  it("returns rate 1 when from === to", async () => {
    const result = await getRate("INR", "INR");
    expect(result).toEqual({ rate: 1, source: "live" });
  });

  it("fetches live rate from API on first call", async () => {
    const spy = mockFetchOk(83.5);
    const result = await getRate("USD", "INR");
    expect(result).toEqual({ rate: 83.5, source: "live" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(`${FRANKFURTER}?from=USD&to=INR`));
  });

  it("serves from cache on second call same day (no second fetch)", async () => {
    const spy = mockFetchOk(83.5);
    await getRate("USD", "INR");
    const result = await getRate("USD", "INR");
    expect(result).toEqual({ rate: 83.5, source: "cache" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("falls back to last cached rate when API fails on a later day", async () => {
    // Day 1: prime cache with a successful fetch
    _setTodayForTests("2026-01-01");
    mockFetchOk(83.5);
    await getRate("USD", "INR");
    vi.restoreAllMocks();

    // Day 2: API down, cache for today is empty but day-1 entry remains
    _setTodayForTests("2026-01-02");
    mockFetchFail();
    const result = await getRate("USD", "INR");
    expect(result).toEqual({ rate: 83.5, source: "fallback" });
  });

  it("returns null when API fails and no cache exists", async () => {
    mockFetchFail();
    const result = await getRate("USD", "INR");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm test -- src/lib/fx/get-rate.test.ts
```

Expected: FAIL with `Cannot find module './get-rate'` or similar — implementation file doesn't exist yet.

---

## Task 3: Implement getRate to make tests pass

**Files:**
- Create: `src/lib/fx/get-rate.ts`

- [ ] **Step 1: Write the implementation**

Create `src/lib/fx/get-rate.ts`:

```ts
type Currency = "USD" | "INR";

type CacheEntry = { rate: number; fetchedAt: number };

const cache = new Map<string, CacheEntry>();
let _testTodayOverride: string | null = null;

const FRANKFURTER_URL = "https://api.frankfurter.app/latest";

function todayKey(from: Currency, to: Currency): string {
  const today = _testTodayOverride ?? new Date().toISOString().slice(0, 10);
  return `${from}-${to}-${today}`;
}

function findLatestCacheForPair(from: Currency, to: Currency): CacheEntry | null {
  const prefix = `${from}-${to}-`;
  let latest: CacheEntry | null = null;
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith(prefix)) continue;
    if (!latest || entry.fetchedAt > latest.fetchedAt) latest = entry;
  }
  return latest;
}

export type RateResult = { rate: number; source: "live" | "cache" | "fallback" };

export async function getRate(from: Currency, to: Currency): Promise<RateResult | null> {
  if (from === to) return { rate: 1, source: "live" };

  const key = todayKey(from, to);
  const todayHit = cache.get(key);
  if (todayHit) return { rate: todayHit.rate, source: "cache" };

  try {
    const res = await fetch(`${FRANKFURTER_URL}?from=${from}&to=${to}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[to];
    if (typeof rate !== "number") throw new Error("rate missing in response");
    cache.set(key, { rate, fetchedAt: Date.now() });
    return { rate, source: "live" };
  } catch {
    const fallback = findLatestCacheForPair(from, to);
    if (fallback) return { rate: fallback.rate, source: "fallback" };
    return null;
  }
}

/** Test-only helper — clears in-memory cache. Do not call from app code. */
export function _clearCacheForTests(): void {
  cache.clear();
}

/** Test-only helper — overrides "today" for cache-key generation. Pass null to restore real date. */
export function _setTodayForTests(date: string | null): void {
  _testTodayOverride = date;
}
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npm test -- src/lib/fx/get-rate.test.ts
```

Expected: all 5 tests pass cleanly. If anything fails, fix and re-run before committing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fx/get-rate.ts src/lib/fx/get-rate.test.ts
git commit -m "$(cat <<'EOF'
feat: add FX rate library with frankfurter.app + daily cache

src/lib/fx/get-rate.ts wraps frankfurter.app for USD<->INR with an
in-memory per-day cache. On API failure it falls back to the most
recent cached rate for the pair, or returns null if no cache exists.
Covered by 5 vitest cases including a date-injection test seam.

Foundation prerequisite for Sales PRD Step 1 (Client P.O. exchangeRate
auto-fill at PO creation).
EOF
)"
```

---

## Task 4: Manual smoke test against the live API

The unit tests mock fetch — this step verifies the real API works.

**Files:**
- Create (temporary): `scripts/tmp-fx-smoke.ts`

- [ ] **Step 1: Write a smoke script**

Create `scripts/tmp-fx-smoke.ts`:

```ts
import { getRate } from "../src/lib/fx/get-rate";

async function main() {
  console.log("Live USD -> INR:", await getRate("USD", "INR"));
  console.log("Live INR -> USD:", await getRate("INR", "USD"));
  console.log("Cache hit USD -> INR:", await getRate("USD", "INR"));
}

main().catch((e) => {
  console.error("FX smoke failed:", e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the smoke script**

Run:
```bash
npx tsx scripts/tmp-fx-smoke.ts
```

Expected output (rates will vary, but format should match):
```
Live USD -> INR: { rate: 83.XX, source: 'live' }
Live INR -> USD: { rate: 0.012XX, source: 'live' }
Cache hit USD -> INR: { rate: 83.XX, source: 'cache' }
```

If the script errors (network blocked, frankfurter down, etc.), report it. Do not commit the temp script.

- [ ] **Step 3: Delete the smoke script**

```bash
rm scripts/tmp-fx-smoke.ts
```

(Nothing to commit — file was never tracked.)

---

## Task 5: Patch the design spec to reflect schema reality

**Files:**
- Modify: `docs/superpowers/specs/2026-05-23-sales-module-prd-design.md`

- [ ] **Step 1: Update §3.1 Customer model block in the spec**

In `docs/superpowers/specs/2026-05-23-sales-module-prd-design.md`, find the block:

```prisma
model Customer {
  // ADD
  isInternational    Boolean   @default(false)
  defaultCurrency    Currency  @default(INR)
}
```

Replace it with:

```prisma
// NOTE: Implemented field is CustomerMaster (existing model). Fields below
// already exist in schema — no migration needed for customer-side wiring.
model CustomerMaster {
  // Existing — re-confirmed during Plan 01 Foundation
  customerType       String   @default("DOMESTIC")   // "DOMESTIC" | "INTERNATIONAL"
  defaultCurrency    String   @default("INR")        // "INR" | "USD"
  currency           String   @default("INR")
}
```

- [ ] **Step 2: Update §3.3 New enums block**

Find:

```prisma
enum Currency        { INR  USD }
enum AllotmentIntent { PENDING  STOCK_FULL  STOCK_PARTIAL  PROCURE }
```

Replace with:

```prisma
// Currency is NOT an enum — uses the existing CurrencyMaster table (data-driven).
// USD is already seeded by prisma/seed.ts.
enum AllotmentIntent { PENDING  STOCK_FULL  STOCK_PARTIAL  PROCURE }
```

- [ ] **Step 3: Append a Spec Patch Log section to the spec**

At the very end of the spec file (after `*End of design spec.*`), append:

```markdown

---

## Spec Patch Log

- **2026-05-23 (Plan 01)** — Removed proposed `Customer.isInternational` field and `Currency` enum. The existing `CustomerMaster.customerType` (`"DOMESTIC"` / `"INTERNATIONAL"`), `CustomerMaster.defaultCurrency`, and `CurrencyMaster` table already cover the requirement. Customer form UI at `src/app/(dashboard)/masters/customers/create/page.tsx:436-447` already auto-derives currency from customer type. No customer-side schema migration is needed.
```

- [ ] **Step 4: Commit the spec patch**

```bash
git add docs/superpowers/specs/2026-05-23-sales-module-prd-design.md
git commit -m "$(cat <<'EOF'
docs: patch Sales PRD spec for actual schema (CustomerMaster, CurrencyMaster)

Existing schema already covers the customer-side international/currency
wiring via CustomerMaster.customerType + defaultCurrency and the
CurrencyMaster table. Patched §3.1 and §3.3 inline and appended a Spec
Patch Log so future readers see the divergence.
EOF
)"
```

---

## Task 6: Push and verify

- [ ] **Step 1: Push all commits to master**

```bash
git push origin master
```

- [ ] **Step 2: Verify the test command works in a clean shell**

Run:
```bash
npm test
```

Expected: all 5 fx tests pass, exit code 0.

- [ ] **Step 3: Sanity check the build still passes**

Run:
```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without errors. The FX module isn't imported anywhere yet, so this is mostly verifying nothing in the vitest install broke the Next.js build pipeline.

---

## Done — what shipped

After this plan executes:

- ✅ `src/lib/fx/get-rate.ts` — production-ready FX rate function with daily cache + fallback
- ✅ `src/lib/fx/get-rate.test.ts` — 5 vitest cases covering all branches
- ✅ `vitest.config.ts` + `npm test` + `npm run test:watch` — test harness
- ✅ Spec patched to reflect actual schema (no fake `Customer` references)

**Not in scope of Foundation (deferred to next plans):**
- Calling `getRate()` from any PO creation form or API route — that's Plan 02 (Step 1).
- `src/lib/calc/po-totals.ts` extraction — moved to Plan 02 since it depends on `isDomesticDelivery` (a Step 1 field).
- Notification dispatcher (`src/lib/notifications/dispatch.ts`) — moved to Plan 04 (Step 3) where it's first called from the allotment wizard.

**Next plan:** `docs/superpowers/plans/2026-05-23-sales-prd-02-step1-client-po.md` (Step 1 — Client P.O. form rewrite + material-code lookup). Will be written after Plan 01 lands.

---

*End of Plan 01.*
