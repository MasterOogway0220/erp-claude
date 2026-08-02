import { describe, expect, it } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  SESSION_ABSOLUTE_MS,
  generateCode,
  otpUsable,
  sessionExpired,
} from "./otp-policy";

const at = (ms: number) => new Date(ms);

describe("otpUsable", () => {
  const now = at(1_000_000);
  const live = { expiresAt: at(1_000_000 + 60_000), attempts: 0, consumedAt: null };

  it("accepts a live, unused code", () => {
    expect(otpUsable(live, now)).toEqual({ ok: true });
  });

  it("rejects when no code was ever issued", () => {
    expect(otpUsable(null, now)).toEqual({ ok: false, reason: "NO_CODE" });
  });

  it("rejects a code that was already used — single use, not reusable", () => {
    expect(otpUsable({ ...live, consumedAt: at(999_000) }, now)).toEqual({
      ok: false,
      reason: "NO_CODE",
    });
  });

  it("rejects on the expiry instant, not a moment later", () => {
    expect(otpUsable({ ...live, expiresAt: now }, now)).toEqual({ ok: false, reason: "EXPIRED" });
    expect(otpUsable({ ...live, expiresAt: at(now.getTime() + 1) }, now)).toEqual({ ok: true });
  });

  it("burns the code once the attempt limit is reached", () => {
    expect(otpUsable({ ...live, attempts: OTP_MAX_ATTEMPTS - 1 }, now)).toEqual({ ok: true });
    expect(otpUsable({ ...live, attempts: OTP_MAX_ATTEMPTS }, now)).toEqual({
      ok: false,
      reason: "TOO_MANY_ATTEMPTS",
    });
  });
});

describe("sessionExpired", () => {
  const loginAt = 1_000_000_000;

  it("keeps the session inside the 24h window", () => {
    expect(sessionExpired(loginAt, loginAt)).toBe(false);
    expect(sessionExpired(loginAt, loginAt + SESSION_ABSOLUTE_MS - 1)).toBe(false);
  });

  it("expires exactly at 24h and stays expired — the cap is absolute", () => {
    expect(sessionExpired(loginAt, loginAt + SESSION_ABSOLUTE_MS)).toBe(true);
    expect(sessionExpired(loginAt, loginAt + SESSION_ABSOLUTE_MS * 10)).toBe(true);
  });

  it("treats a token with no stamp as expired", () => {
    // Tokens minted before 2FA existed carry no loginAt. Defaulting them to
    // "still valid" would exempt every current session from the cap forever.
    expect(sessionExpired(undefined, loginAt)).toBe(true);
  });
});

describe("generateCode", () => {
  it("always returns 6 digits, leading zeros kept", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});
