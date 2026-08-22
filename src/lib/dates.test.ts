import { describe, expect, it } from "vitest";
import { deliveryScheduleToDate, toDateInput } from "./dates";

describe("toDateInput", () => {
  it("formats the LOCAL calendar date, not the UTC one", () => {
    // Local-time constructor: whatever the machine TZ, this is Aug 3 locally.
    expect(toDateInput(new Date(2026, 7, 3, 0, 5))).toBe("2026-08-03");
    // The regression: a timestamp early in the local day must not shift back
    // a day the way toISOString() did.
    const earlyLocal = new Date(2026, 7, 3, 1, 0);
    expect(toDateInput(earlyLocal)).toBe("2026-08-03");
    // On positive-offset machines (IST — where the bug bit) prove the old
    // formula actually disagrees; on UTC machines the two are identical by
    // definition, so there is nothing to distinguish there.
    if (earlyLocal.getTimezoneOffset() < 0) {
      expect(earlyLocal.toISOString().split("T")[0]).not.toBe("2026-08-03");
    }
  });

  it("pads single-digit months and days", () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns empty string for nothing and for junk", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
    expect(toDateInput("")).toBe("");
    expect(toDateInput("not-a-date")).toBe("");
  });
});

describe("deliveryScheduleToDate", () => {
  const poDate = "2026-01-05"; // a Monday

  it("counts weeks from the P.O. date", () => {
    expect(deliveryScheduleToDate("10 weeks", poDate)).toBe("2026-03-16");
    expect(deliveryScheduleToDate("2 wks", poDate)).toBe("2026-01-19");
  });

  it("counts days and months too", () => {
    expect(deliveryScheduleToDate("45 days", poDate)).toBe("2026-02-19");
    expect(deliveryScheduleToDate("3 months", poDate)).toBe("2026-04-05");
  });

  it("commits to the upper bound of a range", () => {
    expect(deliveryScheduleToDate("8-10 weeks", poDate)).toBe(
      deliveryScheduleToDate("10 weeks", poDate)
    );
  });

  it("treats ready stock as deliverable on the P.O. date", () => {
    expect(deliveryScheduleToDate("Ready stock", poDate)).toBe(poDate);
    expect(deliveryScheduleToDate("Immediate", poDate)).toBe(poDate);
  });

  it("returns empty when there is no period to work from", () => {
    expect(deliveryScheduleToDate("as per site requirement", poDate)).toBe("");
    expect(deliveryScheduleToDate("", poDate)).toBe("");
    expect(deliveryScheduleToDate("10 weeks", "")).toBe("");
  });
});
