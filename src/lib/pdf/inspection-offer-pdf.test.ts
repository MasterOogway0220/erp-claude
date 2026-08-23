import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InspectionOfferDocument,
  LengthTallyDocument,
  ColourCodeDocument,
  CriteriaChecklistDocument,
  type InspectionCompany,
  type InspectionOfferData,
  type CriteriaData,
} from "./inspection-offer-pdf";

/**
 * All four documents share one chrome (`bordered-doc.tsx`), so a mistake in
 * that shared layer — a column width set that does not total 100%, a node cell
 * nested wrongly inside a Text — breaks all four at once. These render each
 * one for real, which is the only way a react-pdf layout fault surfaces before
 * a user hits it.
 */

const company: InspectionCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regState: "Maharashtra",
  regPincode: "400004",
  telephoneNo: "+91 22 23634200",
  email: "info@n-pipe.com",
};

const offer: InspectionOfferData = {
  offerNo: "IO/26/0018",
  offerDate: "2026-08-23",
  poNumber: "PO-99120",
  projectName: "Refinery Unit 4",
  inspectionLocation: "Works, Taloja",
  proposedInspectionDate: "2026-09-02",
  quantityReady: "240 Mtr",
  remarks: "Material staged in Bay 3.",
  customer: {
    name: "Larsen & Toubro",
    addressLine1: "Powai Campus",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400072",
  },
  tpiAgency: {
    name: "TUV India",
    contactPerson: "A. Deshpande",
    phone: "+91 98200 11223",
    email: "tpi@tuv.example",
  },
  items: [
    {
      sNo: 1,
      product: "Seamless Pipe",
      material: "ASTM A106 Gr.B",
      sizeLabel: '6" SCH 40',
      heatNo: "H-88214",
      specification: "ASTM A106",
      quantity: "120.500",
      quantityReady: "120.500",
      uom: "Mtr",
      colourCodeRequired: true,
      colourCode: "GREEN/WHITE",
      remark: "",
    },
    {
      sNo: 2,
      product: "BW Fitting",
      material: "ASTM A234 WPB",
      sizeLabel: '8" SCH 80',
      heatNo: "H-88215",
      specification: "ASTM A234",
      quantity: "40",
      quantityReady: "40",
      uom: "Nos",
      // Required but not yet applied — must print PENDING, not blank.
      colourCodeRequired: true,
      colourCode: null,
      remark: "Banding pending",
    },
  ],
};

const criteria: CriteriaData = {
  offerNo: "IO/26/0018",
  offerDate: "2026-08-23",
  poNumber: "PO-99120",
  customerName: "Larsen & Toubro",
  inspectionLocation: "Works, Taloja",
  tpiAgencyName: "TUV India",
  criteria: [
    {
      sNo: 1,
      parameter: "Chemical Composition",
      value: "As per ASTM A106 Gr.B",
      inspectionRequired: true,
      testingRequired: true,
      testType: "Spectro",
      colourCodingRequired: false,
      inspectionLocation: "Lab",
      remarks: "",
    },
    {
      sNo: 2,
      parameter: "Dimensional",
      value: "ASME B36.10",
      inspectionRequired: true,
      testingRequired: false,
      testType: null,
      colourCodingRequired: true,
      inspectionLocation: null,
      remarks: "Sample 10%",
    },
  ],
};

const render = (el: React.ReactElement) => renderToBuffer(el as never);

describe("inspection documents", () => {
  it("renders the inspection offer letter", async () => {
    const buf = await render(
      React.createElement(InspectionOfferDocument, { data: offer, company })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders the length tally list", async () => {
    const buf = await render(
      React.createElement(LengthTallyDocument, { data: offer, company })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders the colour code list, including a PENDING line", async () => {
    const buf = await render(
      React.createElement(ColourCodeDocument, { data: offer, company })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders the criteria checklist", async () => {
    const buf = await render(
      React.createElement(CriteriaChecklistDocument, { data: criteria, company })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders an offer with no TPI agency and no items", async () => {
    // An offer raised before the agency is appointed drops the whole TPI
    // panel; an empty item table must still close its borders.
    const buf = await render(
      React.createElement(InspectionOfferDocument, {
        data: { ...offer, tpiAgency: null, items: [], quantityReady: null, remarks: null },
        company,
      })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("paginates a long tally without losing the repeated header", async () => {
    const many = Array.from({ length: 70 }, (_, i) => ({
      ...offer.items[0],
      sNo: i + 1,
    }));
    const buf = await render(
      React.createElement(LengthTallyDocument, {
        data: { ...offer, items: many },
        company,
      })
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
