import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailFrom, mailerConfigured, missingMailerConfig, smtpPort } from "./mailer";

const KEYS = ["SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_PORT"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("missingMailerConfig", () => {
  it("names what is missing so the error is actionable", () => {
    expect(missingMailerConfig()).toEqual(["SMTP_USER", "SMTP_PASS"]);
    process.env.SMTP_USER = "ops@n-pipe.com";
    expect(missingMailerConfig()).toEqual(["SMTP_PASS"]);
    process.env.SMTP_PASS = "secret";
    expect(missingMailerConfig()).toEqual([]);
    expect(mailerConfigured()).toBe(true);
  });
});

describe("smtpPort", () => {
  it("defaults to 587 and parses an override", () => {
    expect(smtpPort()).toBe(587);
    process.env.SMTP_PORT = "465";
    expect(smtpPort()).toBe(465);
  });
});

describe("mailFrom", () => {
  it("falls back to the authenticated user, never an invented address", () => {
    // The bug this guards: two routes defaulted to noreply@npspipe.com, an
    // address the SMTP account cannot send as — providers reject or spam-file
    // it, and the app sees a success either way.
    process.env.SMTP_USER = "ops@n-pipe.com";
    expect(mailFrom()).toBe("ops@n-pipe.com");
    expect(mailFrom("NPS Piping Solutions")).toBe('"NPS Piping Solutions" <ops@n-pipe.com>');
  });

  it("lets SMTP_FROM win when it is set explicitly", () => {
    process.env.SMTP_USER = "ops@n-pipe.com";
    process.env.SMTP_FROM = '"Sales" <sales@n-pipe.com>';
    expect(mailFrom("Ignored")).toBe('"Sales" <sales@n-pipe.com>');
  });
});
