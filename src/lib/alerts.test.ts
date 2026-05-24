import { describe, it, expect } from "vitest";
import { buildAlertData } from "./alerts";

describe("buildAlertData", () => {
  it("builds a complete alert payload with defaults", () => {
    const d = buildAlertData({
      companyId: "c1",
      type: "STOCK_ALLOTMENT",
      title: "Stock allotted",
      message: "SO-1 stock allotted",
      assignedToRole: "STORES",
      relatedModule: "WarehouseIntimation",
      relatedId: "w1",
    });
    expect(d).toMatchObject({
      companyId: "c1",
      type: "STOCK_ALLOTMENT",
      title: "Stock allotted",
      message: "SO-1 stock allotted",
      severity: "MEDIUM",
      status: "UNREAD",
      assignedToRole: "STORES",
      relatedModule: "WarehouseIntimation",
      relatedId: "w1",
    });
  });

  it("respects an explicit severity", () => {
    const d = buildAlertData({
      companyId: "c1",
      type: "PROCUREMENT_REQUIRED",
      title: "x",
      message: "y",
      assignedToRole: "PURCHASE",
      relatedModule: "PurchaseRequisition",
      relatedId: "pr1",
      severity: "HIGH",
    });
    expect(d.severity).toBe("HIGH");
  });

  it("applies null dueDate by default", () => {
    const d = buildAlertData({
      companyId: "c1",
      type: "STOCK_ALLOTMENT",
      title: "t",
      message: "m",
      assignedToRole: "STORES",
      relatedModule: "Mod",
      relatedId: "id1",
    });
    expect(d.dueDate).toBeNull();
  });

  it("passes through an explicit dueDate", () => {
    const due = new Date("2026-06-01");
    const d = buildAlertData({
      companyId: "c1",
      type: "STOCK_ALLOTMENT",
      title: "t",
      message: "m",
      assignedToRole: "STORES",
      relatedModule: "Mod",
      relatedId: "id1",
      dueDate: due,
    });
    expect(d.dueDate).toBe(due);
  });
});
