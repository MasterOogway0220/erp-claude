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
