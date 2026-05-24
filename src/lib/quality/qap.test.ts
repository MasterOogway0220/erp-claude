import { describe, it, expect } from "vitest";
import {
  deriveWarehouseStatuses,
  qapToOfferPrefill,
  normalizeQapInput,
  VALID_QAP_LOCATIONS,
} from "./qap";

describe("deriveWarehouseStatuses", () => {
  it("inspection PENDING when QAP requires it, NA otherwise", () => {
    expect(deriveWarehouseStatuses(true, {}).inspectionStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(false, {}).inspectionStatus).toBe("NA");
  });
  it("testing PENDING when any item testing flag set, NA otherwise", () => {
    expect(deriveWarehouseStatuses(false, { hydroTestRequired: true }).testingStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(false, { ndtRequired: true }).testingStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(true, {}).testingStatus).toBe("NA");
  });
});

describe("qapToOfferPrefill", () => {
  it("maps QAP header fields to offer prefill", () => {
    const d = new Date("2026-06-01T00:00:00.000Z");
    expect(
      qapToOfferPrefill({
        qapInspectionRequired: true,
        qapInspectionLocation: "LAB",
        qapTpiAgencyId: "agency1",
        qapDocumentPath: null,
        qapProposedInspectionDate: d,
        qapRemarks: null,
      })
    ).toEqual({ inspectionLocation: "LAB", tpiAgencyId: "agency1", proposedInspectionDate: d.toISOString() });
  });
  it("yields empty strings / null when QAP unset", () => {
    expect(
      qapToOfferPrefill({
        qapInspectionRequired: false,
        qapInspectionLocation: null,
        qapTpiAgencyId: null,
        qapDocumentPath: null,
        qapProposedInspectionDate: null,
        qapRemarks: null,
      })
    ).toEqual({ inspectionLocation: "", tpiAgencyId: "", proposedInspectionDate: null });
  });
});

describe("normalizeQapInput", () => {
  it("accepts valid location and coerces types", () => {
    const r = normalizeQapInput({ qapInspectionRequired: true, qapInspectionLocation: "WAREHOUSE", qapTpiAgencyId: "a1" });
    expect(r.qapInspectionRequired).toBe(true);
    expect(r.qapInspectionLocation).toBe("WAREHOUSE");
    expect(r.qapTpiAgencyId).toBe("a1");
  });
  it("rejects an invalid location", () => {
    expect(() => normalizeQapInput({ qapInspectionLocation: "MARS" })).toThrow();
  });
  it("nulls blank optional fields", () => {
    const r = normalizeQapInput({ qapInspectionLocation: "", qapTpiAgencyId: "", qapRemarks: "" });
    expect(r.qapInspectionLocation).toBeNull();
    expect(r.qapTpiAgencyId).toBeNull();
    expect(r.qapRemarks).toBeNull();
  });
});

it("exposes the two valid locations", () => {
  expect(VALID_QAP_LOCATIONS).toEqual(["WAREHOUSE", "LAB"]);
});
