import { describe, expect, it } from "vitest";
import { displayInquiryNo, displaySizeLabel } from "./display";

describe("displayInquiryNo", () => {
  it("keeps real references", () => {
    expect(displayInquiryNo("RFQ000297 / Item - 81616256 / Flange")).toBe(
      "RFQ000297 / Item - 81616256 / Flange"
    );
    expect(displayInquiryNo("ENQ/25-26/0042")).toBe("ENQ/25-26/0042");
  });

  it("suppresses placeholder text without any digits", () => {
    expect(displayInquiryNo("require quotation")).toBe("");
    expect(displayInquiryNo("N/A")).toBe("");
    expect(displayInquiryNo("-")).toBe("");
  });

  it("handles null/undefined/whitespace", () => {
    expect(displayInquiryNo(null)).toBe("");
    expect(displayInquiryNo(undefined)).toBe("");
    expect(displayInquiryNo("   ")).toBe("");
  });
});

describe("displaySizeLabel", () => {
  it("prefers the stored size label", () => {
    expect(displaySizeLabel({ sizeLabel: '6"NB X SCH 40S X 150#' })).toBe(
      '6"NB X SCH 40S X 150#'
    );
  });

  it("builds a pipe size from NPS + schedule when the label is missing", () => {
    expect(displaySizeLabel({ sizeLabel: null, sizeNPS: "1", schedule: "40S" })).toBe(
      '1"NB X SCH 40S'
    );
    expect(displaySizeLabel({ sizeNPS: 0.5 })).toBe('0.5"NB');
  });

  it("falls back to a dash so the cell never prints blank", () => {
    expect(displaySizeLabel({})).toBe("-");
    expect(displaySizeLabel({ sizeLabel: "", sizeNPS: null, schedule: null })).toBe("-");
    expect(displaySizeLabel({ sizeNPS: "abc" })).toBe("-");
  });
});
