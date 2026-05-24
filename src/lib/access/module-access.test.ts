import { describe, it, expect } from "vitest";
import {
  parseModuleAccess,
  isNavItemVisible,
  TEST_USER_EMAIL,
  type NavItemMeta,
} from "./module-access";

// Nav item metadata mirroring the real sidebar definitions
const DASHBOARD: NavItemMeta = {};
const ALERTS: NavItemMeta = { productionHidden: true };
const MASTERS: NavItemMeta = {
  roles: ["SUPER_ADMIN", "ADMIN", "SALES", "PURCHASE"],
  moduleKey: "masters",
};
const QUOTATIONS: NavItemMeta = {
  roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  moduleKey: "quotation",
};
const SALES: NavItemMeta = {
  roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  moduleKey: "sales",
  productionHidden: true,
};
const PURCHASE: NavItemMeta = {
  roles: ["PURCHASE", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  moduleKey: "purchase",
  productionHidden: true,
};

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

describe("isNavItemVisible", () => {
  // The reported bug scenario: employee granted quotation+sales+purchase, role SALES, production ON
  const grantedEmployee = {
    userRole: "SALES" as const,
    userEmail: "emp@erp.com",
    moduleAccess: ["quotation", "sales", "purchase"],
    isProductionMode: true,
  };

  it("granted employee sees their granted modules (sales + purchase) in production", () => {
    expect(isNavItemVisible(SALES, grantedEmployee)).toBe(true);
    expect(isNavItemVisible(PURCHASE, grantedEmployee)).toBe(true);
    expect(isNavItemVisible(QUOTATIONS, grantedEmployee)).toBe(true);
  });

  it("granted employee does NOT see ungranted Masters", () => {
    expect(isNavItemVisible(MASTERS, grantedEmployee)).toBe(false);
  });

  it("granted employee still sees always-on Dashboard, never ungranted Alerts", () => {
    expect(isNavItemVisible(DASHBOARD, grantedEmployee)).toBe(true);
    expect(isNavItemVisible(ALERTS, grantedEmployee)).toBe(false);
  });

  // Ungranted login keeps the production lockdown (Masters + Quotation only)
  const ungrantedUser = {
    userRole: "SALES" as const,
    userEmail: "nobody@erp.com",
    moduleAccess: [] as string[],
    isProductionMode: true,
  };

  it("ungranted login in production sees Masters + Quotation but not Sales/Purchase", () => {
    expect(isNavItemVisible(MASTERS, ungrantedUser)).toBe(true);
    expect(isNavItemVisible(QUOTATIONS, ungrantedUser)).toBe(true);
    expect(isNavItemVisible(SALES, ungrantedUser)).toBe(false);
    expect(isNavItemVisible(PURCHASE, ungrantedUser)).toBe(false);
  });

  // Test user sees everything in production
  const testUser = {
    userRole: "ADMIN" as const,
    userEmail: TEST_USER_EMAIL,
    moduleAccess: [] as string[],
    isProductionMode: true,
  };

  it("test user sees all modules in production (incl. productionHidden)", () => {
    expect(isNavItemVisible(SALES, testUser)).toBe(true);
    expect(isNavItemVisible(PURCHASE, testUser)).toBe(true);
    expect(isNavItemVisible(ALERTS, testUser)).toBe(true);
    expect(isNavItemVisible(MASTERS, testUser)).toBe(true);
  });

  it("outside production, a granted employee sees granted modules and not ungranted ones", () => {
    const dev = { ...grantedEmployee, isProductionMode: false };
    expect(isNavItemVisible(SALES, dev)).toBe(true);
    expect(isNavItemVisible(MASTERS, dev)).toBe(false);
  });
});
