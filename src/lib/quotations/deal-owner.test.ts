import { describe, it, expect } from "vitest";
import { dealOwnerPatch } from "./deal-owner";

describe("dealOwnerPatch", () => {
  it("leaves the owner untouched when the payload omits the key", () => {
    expect(dealOwnerPatch(undefined)).toEqual({});
  });

  it("assigns the owner when an id is sent", () => {
    expect(dealOwnerPatch("cmrnhqlsi000004l2j31x0c6q")).toEqual({
      dealOwnerId: "cmrnhqlsi000004l2j31x0c6q",
    });
  });

  it("unassigns on an explicit null or empty string", () => {
    expect(dealOwnerPatch(null)).toEqual({ dealOwnerId: null });
    expect(dealOwnerPatch("")).toEqual({ dealOwnerId: null });
  });
});
