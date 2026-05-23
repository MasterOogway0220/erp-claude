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
