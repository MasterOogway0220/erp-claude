import { describe, expect, it } from "vitest";
import { interpretHealth } from "./db-down";

describe("interpretHealth", () => {
  it("reports down when the TCP socket is dropped — the firewall case", () => {
    expect(
      interpretHealth({ tcp: { reachable: false, error: "TCP_TIMEOUT" }, driver: { connected: false } })
    ).toBe(true);
  });

  it("reports down when the network is fine but MySQL refuses the host", () => {
    expect(
      interpretHealth({
        tcp: { reachable: true },
        driver: { connected: false, message: "Host '1.2.3.4' is not allowed to connect" },
      })
    ).toBe(true);
  });

  it("reports down when DATABASE_URL is not set at all", () => {
    expect(interpretHealth({ error: "DATABASE_URL not set" })).toBe(true);
  });

  it("reports up when both probes succeed — so a wrong password stays a wrong password", () => {
    expect(interpretHealth({ tcp: { reachable: true }, driver: { connected: true } })).toBe(false);
  });

  it("defaults to up on anything it cannot read", () => {
    expect(interpretHealth(null)).toBe(false);
    expect(interpretHealth(undefined)).toBe(false);
    expect(interpretHealth("gateway timeout")).toBe(false);
    expect(interpretHealth({})).toBe(false);
  });
});
