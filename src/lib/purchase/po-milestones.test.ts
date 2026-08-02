import { describe, expect, it } from "vitest";
import { MILESTONE_ORDER, VENDOR_MILESTONES, isMilestoneAhead } from "./po-milestones";

const offered = (status: string) =>
  VENDOR_MILESTONES.filter((m) => isMilestoneAhead(status, m.status)).map((m) => m.status);

describe("isMilestoneAhead", () => {
  it("offers every remaining stage once the PO is with the vendor", () => {
    expect(offered("SENT_TO_VENDOR")).toEqual([
      "ACKNOWLEDGED",
      "IN_PRODUCTION",
      "READY_FOR_DISPATCH",
    ]);
  });

  it("drops stages the PO has already passed", () => {
    expect(offered("ACKNOWLEDGED")).toEqual(["IN_PRODUCTION", "READY_FOR_DISPATCH"]);
    expect(offered("IN_PRODUCTION")).toEqual(["READY_FOR_DISPATCH"]);
    expect(offered("READY_FOR_DISPATCH")).toEqual([]);
  });

  it("offers nothing before the PO is sent", () => {
    // Nothing to report while it is still internal.
    for (const s of ["DRAFT", "PENDING_APPROVAL", "OPEN"]) {
      expect(offered(s)).toEqual([]);
    }
  });

  it("offers nothing once the order is finished or dead", () => {
    // The bug this guards: "Mark Acknowledged" on a cancelled or fully
    // received PO. Neither is in the chain, so indexOf returns -1.
    for (const s of ["PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED", "CANCELLED"]) {
      expect(offered(s)).toEqual([]);
    }
  });

  it("never treats a stage as ahead of itself", () => {
    for (const s of MILESTONE_ORDER) expect(isMilestoneAhead(s, s)).toBe(false);
  });

  it("ignores an unknown status rather than guessing", () => {
    expect(offered("SOME_FUTURE_STATUS")).toEqual([]);
    expect(isMilestoneAhead("SENT_TO_VENDOR", "NOT_A_STAGE")).toBe(false);
  });
});
