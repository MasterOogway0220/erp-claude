import { describe, expect, it } from "vitest";
import {
  REMINDER_COOLDOWN_HOURS,
  REMINDER_LEAD_DAYS,
  type RfqVendorState,
  hasExpired,
  needsReminder,
} from "./rfq-reminders";

const NOW = new Date("2026-08-10T09:00:00Z");
const hours = (n: number) => new Date(NOW.getTime() + n * 60 * 60 * 1000);
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const base: RfqVendorState = {
  status: "PENDING",
  sentDate: days(-5),
  submissionDeadline: days(1),
  lastReminderDate: null,
};

describe("needsReminder", () => {
  it("nudges once the deadline is inside the lead window", () => {
    expect(needsReminder(base, NOW)).toBe(true);
    expect(needsReminder({ ...base, submissionDeadline: days(REMINDER_LEAD_DAYS) }, NOW)).toBe(true);
  });

  it("stays quiet while the deadline is still far off", () => {
    expect(needsReminder({ ...base, submissionDeadline: days(REMINDER_LEAD_DAYS + 1) }, NOW)).toBe(false);
  });

  it("stays quiet once the deadline has passed — that is expiry, not a nudge", () => {
    expect(needsReminder({ ...base, submissionDeadline: hours(-1) }, NOW)).toBe(false);
    expect(needsReminder({ ...base, submissionDeadline: NOW }, NOW)).toBe(false);
  });

  it("does not nudge a vendor who already answered", () => {
    for (const status of ["SUBMITTED", "REVISED", "EXPIRED", "REJECTED"]) {
      expect(needsReminder({ ...base, status }, NOW)).toBe(false);
    }
  });

  it("does not nudge when the RFQ was never sent", () => {
    expect(needsReminder({ ...base, sentDate: null }, NOW)).toBe(false);
  });

  it("respects the cooldown so a job that runs often cannot spam", () => {
    expect(needsReminder({ ...base, lastReminderDate: hours(-1) }, NOW)).toBe(false);
    expect(
      needsReminder({ ...base, lastReminderDate: hours(-REMINDER_COOLDOWN_HOURS) }, NOW)
    ).toBe(true);
  });

  it("ignores an RFQ with no deadline — there is nothing to count down to", () => {
    expect(needsReminder({ ...base, submissionDeadline: null }, NOW)).toBe(false);
  });
});

describe("hasExpired", () => {
  it("expires on and after the deadline", () => {
    expect(hasExpired({ ...base, submissionDeadline: NOW }, NOW)).toBe(true);
    expect(hasExpired({ ...base, submissionDeadline: hours(-1) }, NOW)).toBe(true);
  });

  it("leaves a live RFQ alone", () => {
    expect(hasExpired({ ...base, submissionDeadline: hours(1) }, NOW)).toBe(false);
  });

  it("never re-expires or overwrites a vendor who responded", () => {
    for (const status of ["SUBMITTED", "REVISED", "EXPIRED", "REJECTED"]) {
      expect(hasExpired({ ...base, status, submissionDeadline: hours(-1) }, NOW)).toBe(false);
    }
  });

  it("leaves an open-ended RFQ open", () => {
    expect(hasExpired({ ...base, submissionDeadline: null }, NOW)).toBe(false);
  });
});
