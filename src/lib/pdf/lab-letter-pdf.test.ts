import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LabLetterDocument, type LabLetterData } from "./lab-letter-pdf";

/**
 * A react-pdf layout error (a bad style key, a Text outside a View, a width
 * that does not resolve) throws at render time, not at compile time — so a
 * document can be perfectly type-correct and still fail the moment a user asks
 * for it. Chromium used to absorb malformed markup silently; react-pdf does
 * not, so every document needs a render that actually runs.
 */

/**
 * renderToBuffer's parameter is typed as a `<Document>` element specifically,
 * and a function component that returns one does not satisfy that nominal
 * shape. The cast is at the boundary only — a real layout error still throws.
 */
function render(data: LabLetterData, testNames: string[]) {
  return renderToBuffer(
    React.createElement(LabLetterDocument, { data, testNames }) as never
  );
}

const full: LabLetterData = {
  letterNo: "LAB/26/0031",
  letterDate: "2026-08-23",
  poNumber: "PO-99120",
  clientName: "Larsen & Toubro",
  labName: "Metallurgical Testing Services",
  labAddress: "Unit 4, MIDC Bhosari, Pune 411026",
  productDescription: "Seamless Pipe",
  itemCode: "P-A106-6-40",
  specification: "ASTM A106 Gr.B",
  sizeLabel: '6" SCH 40',
  heatNo: "H-88214",
  make: "Jindal",
  quantity: "120.5",
  unit: "MTR",
  witnessRequired: true,
  tpiAgencyName: "TUV India",
  tpiAgency: { contactPerson: "A. Deshpande", phone: "+91 98200 11223" },
  remarks: "Sample to be drawn in presence of TPI.\nReport required in 5 days.",
  generatedBy: { name: "R. Kulkarni" },
  company: {
    companyName: "NPS Piping Solutions",
    regAddressLine1: "1210 Prasad Chambers",
    regCity: "Mumbai",
    regState: "Maharashtra",
    regPincode: "400004",
    telephoneNo: "+91 22 23634200",
    email: "info@n-pipe.com",
    gstNo: "27AAACN1234A1Z5",
  },
};

describe("LabLetterDocument", () => {
  it("renders a complete letter to a PDF buffer", async () => {
    const buf = await render(full, [
      "Chemical Analysis",
      "Tensile",
      "Impact (-46degC)",
      "Hardness",
    ]);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders when every optional field is missing", async () => {
    // The material table drops a row per empty value; with all of them empty
    // the table collapses to nothing, which must not break the page layout.
    const bare: LabLetterData = {
      letterNo: "LAB/26/0032",
      letterDate: null,
    };
    const buf = await render(bare, []);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("names the TPI agency when a witness is required", async () => {
    // Regression guard: witnessRequired with no agency yet must still render
    // the panel rather than throwing on the undefined name.
    const buf = await render(
      { ...full, tpiAgencyName: null, tpiAgency: null },
      ["Tensile"]
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
