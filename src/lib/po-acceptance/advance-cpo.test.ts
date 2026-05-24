import { describe, it, expect } from "vitest";
import { cpoStatusAfterIssue, isPoaIssueTransition } from "./advance-cpo";

describe("cpoStatusAfterIssue", () => {
  it("advances REGISTERED and DRAFT to ACCEPTED", () => {
    expect(cpoStatusAfterIssue("REGISTERED")).toBe("ACCEPTED");
    expect(cpoStatusAfterIssue("DRAFT")).toBe("ACCEPTED");
  });
  it("leaves already-advanced or unknown CPO statuses unchanged", () => {
    expect(cpoStatusAfterIssue("ACCEPTED")).toBeNull();
    expect(cpoStatusAfterIssue("PARTIALLY_FULFILLED")).toBeNull();
    expect(cpoStatusAfterIssue("FULLY_FULFILLED")).toBeNull();
    expect(cpoStatusAfterIssue("CANCELLED")).toBeNull();
    expect(cpoStatusAfterIssue(null)).toBeNull();
    expect(cpoStatusAfterIssue(undefined)).toBeNull();
  });
});

describe("isPoaIssueTransition", () => {
  it("is true only when moving into ISSUED from a non-ISSUED state", () => {
    expect(isPoaIssueTransition("ISSUED", "DRAFT")).toBe(true);
    expect(isPoaIssueTransition("ISSUED", "PENDING")).toBe(true);
  });
  it("is false when already ISSUED or not issuing", () => {
    expect(isPoaIssueTransition("ISSUED", "ISSUED")).toBe(false);
    expect(isPoaIssueTransition("DRAFT", "DRAFT")).toBe(false);
    expect(isPoaIssueTransition(undefined, "DRAFT")).toBe(false);
    expect(isPoaIssueTransition(null, "DRAFT")).toBe(false);
  });
});
