import { afterEach, describe, expect, it } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  SESSION_ABSOLUTE_MS,
  generateCode,
  otpEnabled,
  otpRequiredFor,
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

describe("otpRequiredFor", () => {
  const saved = process.env.OTP_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.OTP_ENABLED;
    else process.env.OTP_ENABLED = saved;
  });

  it("asks nobody for a code while the feature is off", () => {
    delete process.env.OTP_ENABLED;
    expect(otpEnabled()).toBe(false);
    expect(otpRequiredFor("SALES")).toBe(false);
    expect(otpRequiredFor("ADMIN")).toBe(false);
  });

  it("only counts the exact string 'true' as on", () => {
    process.env.OTP_ENABLED = "1";
    expect(otpEnabled()).toBe(false);
    process.env.OTP_ENABLED = "TRUE";
    expect(otpEnabled()).toBe(false);
    process.env.OTP_ENABLED = "true";
    expect(otpEnabled()).toBe(true);
  });

  it("exempts admins and requires a code from everyone else", () => {
    process.env.OTP_ENABLED = "true";
    // Break-glass accounts: email OTP is only as available as SMTP.
    expect(otpRequiredFor("ADMIN")).toBe(false);
    expect(otpRequiredFor("SUPER_ADMIN")).toBe(false);
    // The roles 2FA was actually asked for.
    for (const role of ["SALES", "MANAGEMENT", "ACCOUNTS", "STORES", "PURCHASE", "QC"]) {
      expect(otpRequiredFor(role)).toBe(true);
    }
    // An unknown or missing role must not fall into the exempt list.
    expect(otpRequiredFor(null)).toBe(true);
    expect(otpRequiredFor(undefined)).toBe(true);
    expect(otpRequiredFor("")).toBe(true);
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
