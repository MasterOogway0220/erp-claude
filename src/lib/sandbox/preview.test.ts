import { describe, expect, it, vi, beforeEach } from "vitest";

// The gate decides, per request, whether a user sees the previewed code. Only
// the sandbox login may get the new handler; everyone else must get the old one.
const sandboxUser = vi.hoisted(() => ({ id: null as string | null }));
vi.mock("./context", () => ({ currentSandbox: async () => sandboxUser.id }));

import { sandboxGate } from "./preview";

const next = vi.fn(async () => new Response("next"));
const legacy = vi.fn(async () => new Response("legacy"));

describe("sandboxGate", () => {
  beforeEach(() => {
    next.mockClear();
    legacy.mockClear();
  });

  it("serves the new handler to the sandbox login", async () => {
    sandboxUser.id = "sandbox-user-id";
    const res = await sandboxGate(next, legacy)("req", "ctx");
    expect(await (res as Response).text()).toBe("next");
    expect(next).toHaveBeenCalledWith("req", "ctx");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("serves the unchanged handler to every other user", async () => {
    sandboxUser.id = null;
    const res = await sandboxGate(next, legacy)("req", "ctx");
    expect(await (res as Response).text()).toBe("legacy");
    expect(next).not.toHaveBeenCalled();
  });

  it("answers 405 when the method exists only on the other side", async () => {
    sandboxUser.id = null;
    const res = (await sandboxGate(next, undefined)("req", "ctx")) as Response;
    expect(res.status).toBe(405);
    expect(next).not.toHaveBeenCalled();
  });
});
