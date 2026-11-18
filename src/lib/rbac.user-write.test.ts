import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/sandbox/context", () => ({ currentSandbox: () => false }));

import { userWriteError } from "@/lib/rbac";

describe("userWriteError", () => {
  it("lets an ADMIN manage ordinary users", () => {
    expect(userWriteError("ADMIN", "SALES", "PURCHASE")).toBeNull();
    expect(userWriteError("ADMIN", "SALES")).toBeNull();
    expect(userWriteError("ADMIN", null, "SALES")).toBeNull();
  });

  it("stops an ADMIN granting or touching SUPER_ADMIN", () => {
    expect(userWriteError("ADMIN", "SALES", "SUPER_ADMIN")).toMatch(/Super Admin/);
    expect(userWriteError("ADMIN", "SUPER_ADMIN")).toMatch(/Super Admin/);
    expect(userWriteError("ADMIN", "SUPER_ADMIN", "SALES")).toMatch(/Super Admin/);
  });

  it("lets a SUPER_ADMIN do both", () => {
    expect(userWriteError("SUPER_ADMIN", "SUPER_ADMIN", "ADMIN")).toBeNull();
    expect(userWriteError("SUPER_ADMIN", null, "SUPER_ADMIN")).toBeNull();
  });

  it("rejects roles that do not exist, for everyone", () => {
    expect(userWriteError("SUPER_ADMIN", null, "ROOT")).toBe("Invalid role");
    expect(userWriteError("ADMIN", "SALES", 42)).toBe("Invalid role");
  });
});
