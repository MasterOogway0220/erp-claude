import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { IssueSlipDocument, type IssueSlipData, type CompanyInfo } from "./issue-slip-pdf";

/**
 * The point of these assertions is that the document *renders*. A react-pdf
 * layout error (a bad style key, a Text outside a View, a width that does not
 * resolve) throws at render time, not at compile time — so a document can be
 * perfectly type-correct and still fail the moment a user asks for it. That is
 * exactly the failure the Chromium pipeline used to absorb.
 */

const company: CompanyInfo = {
  companyName: "N Pipe Solutions",
  regAddressLine1: "Plot 21, MIDC",
  regCity: "Pune",
  regPincode: "411019",
  telephoneNo: "+91 20 1234 5678",
};

const base: IssueSlipData = {
  issueNo: "ISS/26/0007",
  issueDate: "2026-08-21",
  status: "AUTHORIZED",
  salesOrder: { soNo: "SO/26/0142", customer: { name: "Larsen & Toubro" } },
  issuedBy: { name: "R. Kulkarni" },
  authorizedBy: { name: "S. Mehta" },
  items: [
    {
      heatNo: "H-88214",
      sizeLabel: '6" SCH 40',
      material: "ASTM A106 Gr.B",
      quantityMtr: 120.5,
      pieces: 20,
      location: "Rack B/3",
    },
    {
      heatNo: "H-88215",
      sizeLabel: '8" SCH 80',
      material: "ASTM A312 TP316L",
      quantityMtr: 64.25,
      pieces: 11,
      location: "Rack C/1",
    },
  ],
};

async function render(data: IssueSlipData) {
  return renderToBuffer(
    React.createElement(IssueSlipDocument, { data, company }) as any
  );
}

describe("IssueSlipDocument", () => {
  it("renders a valid PDF", async () => {
    const buf = await render(base);
    // %PDF- magic bytes. Anything else is not a PDF a reader will open.
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  }, 30_000);

  // Every one of these is a real shape the database produces. A null heat
  // number or an empty slip must still yield a document rather than a 500 —
  // the storekeeper still needs the paper.
  it("survives missing optional fields and an empty item list", async () => {
    const buf = await render({
      ...base,
      remarks: null,
      issuedBy: null,
      authorizedBy: null,
      salesOrder: { soNo: "SO/26/0143", customer: null },
      items: [],
    });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  it("renders remarks and an unknown status without throwing", async () => {
    const buf = await render({
      ...base,
      remarks: "Partial issue against balance quantity.",
      status: "SOMETHING_NEW",
    });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  // A slip long enough to spill onto a second page exercises the repeating
  // header and the page-break cell borders.
  it("renders a multi-page slip", async () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      ...base.items[0],
      heatNo: `H-${90000 + i}`,
    }));
    const buf = await render({ ...base, items: many });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(3000);
  }, 60_000);
});
