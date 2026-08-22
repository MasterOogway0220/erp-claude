import { describe, it, expect } from "vitest";
import {
  formatTechnicalRequirements,
  parseStringArray,
} from "./technical-requirements";

describe("parseStringArray", () => {
  it("reads the JSON string the column actually stores", () => {
    expect(parseStringArray('["DP_TEST","UT_TEST"]')).toEqual([
      "DP_TEST",
      "UT_TEST",
    ]);
  });

  it("tolerates the comma-separated form written by early rows", () => {
    expect(parseStringArray("DP_TEST, UT_TEST")).toEqual([
      "DP_TEST",
      "UT_TEST",
    ]);
  });

  it("treats null and empty as no tests", () => {
    expect(parseStringArray(null)).toEqual([]);
    expect(parseStringArray("")).toEqual([]);
  });
});

describe("formatTechnicalRequirements", () => {
  it("returns null when nothing is required, so the column stays NULL", () => {
    expect(formatTechnicalRequirements(null)).toBeNull();
    expect(
      formatTechnicalRequirements({ tpiRequired: false, ndtRequired: false })
    ).toBeNull();
  });

  it("renders every requirement the purchase in-charge has to buy against", () => {
    const text = formatTechnicalRequirements({
      tpiRequired: true,
      tpiType: "TPI_CLIENT_QA",
      vdiRequired: true,
      vdiWitnessPercent: 10,
      hydroTestRequired: true,
      hydroWitnessPercent: 100,
      labTestingRequired: true,
      requiredLabTests: '["CHEMICAL","IMPACT"]',
      otherLabTests: "Corrosion resistance per client spec",
      ndtRequired: true,
      ndtTests: '["DP_TEST","RADIOGRAPHY"]',
      pmiRequired: true,
      pmiType: "UNDER_WITNESS",
      coatingRequired: true,
      coatingType: "Epoxy",
      coatingSide: "BOTH",
      hotDipGalvanising: true,
      screwedEnds: true,
      colourCodingRequired: true,
      colourCode: "Blue band",
      additionalSpec: "ASTM A312 + client addendum",
      additionalPipeSpec: "NACE MR0175",
    })!;

    expect(text).toContain("TPI: Inspection under TPI/Client QA");
    expect(text).toContain("VDI inspection: witness 10%");
    expect(text).toContain("Hydro test: witness 100%");
    expect(text).toContain(
      "Lab tests: Chemical Test, Impact Test, Other: Corrosion resistance per client spec"
    );
    expect(text).toContain("NDT: DP Test, Radiography");
    expect(text).toContain("PMI: Under Witness");
    expect(text).toContain("Coating: Epoxy (Both)");
    expect(text).toContain("Hot Dip Galvanising: required");
    expect(text).toContain("Screwed Ends: required");
    expect(text).toContain("Colour coding: Blue band");
    expect(text).toContain("Additional spec to comply with: ASTM A312 + client addendum");
    expect(text).toContain("Stencil on pipe: NACE MR0175");
  });

  it("still flags a requirement whose detail was left blank", () => {
    const text = formatTechnicalRequirements({
      labTestingRequired: true,
      ndtRequired: true,
    })!;
    expect(text).toContain("Lab testing: required (tests not yet specified)");
    expect(text).toContain("NDT: required (tests not yet specified)");
  });
});
