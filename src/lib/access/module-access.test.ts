import { describe, it, expect } from "vitest";
import { parseModuleAccess } from "./module-access";

// The `isNavItemVisible` suite that used to live here went with the function:
// every rule it tested (role gate, grant gate, production lockdown) has been
// removed by owner request, so there is nothing left to assert about nav
// visibility — every signed-in user sees every module. Recover it from git
// history if any gate is reinstated.

describe("parseModuleAccess", () => {
  it("parses a JSON-stringified array (the stored format)", () => {
    expect(parseModuleAccess('["quotation","sales","purchase"]')).toEqual([
      "quotation",
      "sales",
      "purchase",
    ]);
  });

  it("returns [] for null / undefined / empty", () => {
    expect(parseModuleAccess(null)).toEqual([]);
    expect(parseModuleAccess(undefined)).toEqual([]);
    expect(parseModuleAccess("")).toEqual([]);
  });

  it("returns [] for malformed JSON (never throws)", () => {
    expect(parseModuleAccess("not json")).toEqual([]);
    expect(parseModuleAccess("{}")).toEqual([]); // object, not array
  });

  it("passes through an already-parsed array (defensive)", () => {
    expect(parseModuleAccess(["a", "b"] as unknown as string)).toEqual(["a", "b"]);
  });
});
