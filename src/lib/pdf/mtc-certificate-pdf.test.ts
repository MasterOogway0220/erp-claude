import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  MtcCertificateDocument,
  type MtcCertificate,
  type MtcCompany,
} from "./mtc-certificate-pdf";

/**
 * The MTC is the most structurally fragile document here: react-pdf has no
 * rowspan, so every "spanning" cell is a fixed-height box sitting beside a
 * stack of fixed-height rows. If those heights ever disagree the certificate
 * silently misaligns — and it goes to a customer's QA department as evidence.
 * These renders exercise both tables with and without the optional impact
 * block, which changes the whole column layout.
 */

const company: MtcCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200",
  fax: "+91 22 23634300",
  worksAddress: "Plot 21, MIDC Taloja",
};

const ELEMENTS = ["C", "Mn", "P", "S", "Si", "Cr", "Mo", "Ni", "Cu", "V", "F1", "CEQ"];

function chem(element: string) {
  return {
    element,
    minValue: null,
    maxValue: 0.25,
    heatResult: 0.17,
    productResult: 0.17,
    sortOrder: 0,
  };
}

function mech(propertyName: string, min: number | null, max: number | null, result: number) {
  return { propertyName, unit: "MPa", minValue: min, maxValue: max, result, sortOrder: 0 };
}

function item(itemNo: number, withImpact: boolean) {
  return {
    itemNo,
    description: 'Seamless Pipe 6" SCH 40',
    constructionType: "SMLS",
    dimensionStandard: "ASME B36.10",
    sizeOD1: "168.3",
    sizeWT1: "7.11",
    sizeOD2: null,
    sizeWT2: null,
    quantity: 20,
    heatNo: "H-88214",
    rawMaterial: "ASTM A106 Gr.B",
    orientation: "L",
    specimenForm: "R",
    clientItemCode: "LT-4471",
    chemicalResults: ELEMENTS.map(chem),
    mechanicalResults: [
      mech("Yield Strength", 240, null, 306.69),
      mech("Tensile Strength", 415, null, 492.28),
      mech("Elongation", 30, null, 41.35),
      mech("Reduction of Area", null, null, 0),
      mech("Hardness HB", null, 197, 143),
      mech("Hardness HB 2", null, null, 144),
      mech("Hardness HB 3", null, null, 144),
    ],
    impactResults: withImpact
      ? [{ specimenSize: "10x10", result1: 62, result2: 58, result3: 65, average: 61.7 }]
      : [],
  };
}

function cert(withImpact: boolean): MtcCertificate {
  return {
    certificateNo: "NPFI/MTC/26/0451",
    certificateDate: "2026-08-23",
    customerName: "Larsen & Toubro",
    poNo: "PO-99120",
    poDate: "2026-05-28",
    projectName: "Refinery Unit 4",
    otherReference: "REV-2",
    materialSpec: "ASTM A106 Gr.B",
    startingMaterial: "Billet",
    additionalRequirement: "NACE MR0175",
    heatTreatment: "Normalized",
    notes: "Visual & Dimension : Satisfactory\nHydro tested at 50 bar",
    remarks: "Material free from radioactive contamination.",
    reviewedBy: "R. Kulkarni",
    witnessedBy: "TUV India",
    revision: 2,
    items: [item(1, withImpact), item(2, withImpact)],
  };
}

const render = (c: MtcCertificate, elements = ELEMENTS) =>
  renderToBuffer(
    React.createElement(MtcCertificateDocument, {
      certificate: c,
      company,
      chemElements: elements,
      // Empty so the document uses its text fallback: a remote image would
      // make this test depend on the network.
      companyLogoUrl: "",
      isoLogoUrl: "",
    }) as never
  );

describe("MtcCertificateDocument", () => {
  it("renders a certificate with impact results", async () => {
    const buf = await render(cert(true));
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(2000);
  });

  it("renders a certificate without impact results", async () => {
    // hasImpact changes the column-width table for the whole mechanical
    // section, so both variants have to lay out.
    const buf = await render(cert(false));
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("omits the chemistry table when no elements are reported", async () => {
    const bare = cert(false);
    bare.items = bare.items!.map((i) => ({ ...i, chemicalResults: [] }));
    const buf = await render(bare, []);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders with no items at all", async () => {
    const buf = await render({ ...cert(false), items: [] }, []);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders with notes and remarks absent", async () => {
    const buf = await render({ ...cert(true), notes: null, remarks: null });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
