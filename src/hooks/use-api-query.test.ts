import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchJson } from "./use-api-query";

/**
 * `fetchJson` is the single place every screen's reads now pass through, so
 * its error branch decides what a user sees when the database is down — the
 * failure this application actually suffers. A non-2xx must throw (React Query
 * only retries and shows an error state if it does); silently returning the
 * body would render an error payload as if it were rows.
 */

const mockFetch = (init: {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(init));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("returns the parsed body on success", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ stocks: [1, 2] }) });
    await expect(fetchJson<{ stocks: number[] }>("/api/x")).resolves.toEqual({
      stocks: [1, 2],
    });
  });

  it("throws on a non-2xx rather than returning the error body", async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({ error: "boom" }) });
    await expect(fetchJson("/api/x")).rejects.toThrow(/500/);
  });

  it("includes the API's own error message when it sends one", async () => {
    // The routes in this app answer `{ error: "..." }`, and that text is
    // usually more useful than the status code alone.
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: "Missing mandatory documents" }),
    });
    await expect(fetchJson("/api/x")).rejects.toThrow(
      /Missing mandatory documents/
    );
  });

  it("still throws when the error body is not JSON", async () => {
    // A gateway timeout or an HTML error page must not turn into a parse
    // crash that masks the real status.
    mockFetch({
      ok: false,
      status: 504,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    await expect(fetchJson("/api/x")).rejects.toThrow(/504/);
  });
});
