import { describe, expect, it } from "vitest";
import { SANDBOX_HEADER, markSandboxHeaders } from "./headers";

const incoming = () => new Headers({ [SANDBOX_HEADER]: "forged-user", cookie: "a=1" });

describe("markSandboxHeaders", () => {
  it("strips a client-sent sandbox header for a normal user", () => {
    const h = markSandboxHeaders(incoming(), { id: "u1", isSandbox: false });
    expect(h.has(SANDBOX_HEADER)).toBe(false);
    expect(h.get("cookie")).toBe("a=1");
  });

  it("strips it when there is no token", () => {
    expect(markSandboxHeaders(incoming(), null).has(SANDBOX_HEADER)).toBe(false);
  });

  it("sets it from the verified token for a sandbox user, overriding any forged value", () => {
    expect(markSandboxHeaders(incoming(), { id: "akash", isSandbox: true }).get(SANDBOX_HEADER)).toBe("akash");
  });

  it("does not mark a sandbox token that has no user id", () => {
    expect(markSandboxHeaders(incoming(), { isSandbox: true }).has(SANDBOX_HEADER)).toBe(false);
  });
});
