import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DossierDocument,
  DOSSIER_SECTIONS,
  BUNDLE_SECTIONS,
  ALL_SECTIONS,
  type DossierCompany,
  type DossierData,
  type DossierSection,
} from "./dossier-pdf";

/**
 * This one document backs two routes — the full dossier and the dispatch-note
 * bundle — so a layout fault in a shared page breaks both. Every section is
 * rendered here both with data and empty, because the empty case is not a
 * no-op: a dossier prints an explicit "no records" page rather than omitting
 * the section, and that placeholder has to lay out too.
 */

const company: DossierCompany = {
  companyName: "NPS Piping Solutions",
  address: "1210 Prasad Chambers, Mumbai - 400004",
  contact: "Tel: +91 22 23634200 | info@n-pipe.com",
};

const populated: DossierData = {
  dispatchNote: {
    dnNo: "DN/26/0088",
    dispatchDate: "2026-08-23",
    vehicleNo: "MH-04-AB-1234",
    lrNo: "LR-55123",
    ewayBillNo: "391004512233",
    destination: "Powai, Mumbai",
    remarks: "Handle with care.",
    transporter: { name: "VRL Logistics" },
    dispatchAddress: {
      companyName: "L&T Powai Site",
      addressLine1: "Gate 3",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400072",
      contactPerson: "S. Iyer",
      contactNumber: "+91 98200 55443",
      gstNo: "27AABCL1234M1Z9",
    },
    packingList: { plNo: "PL/26/0044" },
  },
  customer: {
    name: "Larsen & Toubro",
    gstNo: "27AABCL1234M1Z9",
    addressLine1: "Powai Campus",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400072",
    contactPerson: "A. Nair",
    phone: "+91 22 6705 0000",
  },
  salesOrder: { soNo: "SO/26/0142" },
  clientPO: {
    cpoNo: "CPO/26/0031",
    clientPoNumber: "PO-99120",
    cpoDate: "2026-05-30",
    clientPoDate: "2026-05-28",
    customer: { name: "Larsen & Toubro" },
    projectName: "Refinery Unit 4",
    paymentTerms: "30 days",
    deliveryTerms: "Ex-works",
    grandTotal: 283200,
    remarks: "Phased delivery.",
    items: [
      {
        sNo: 1,
        product: "Seamless Pipe",
        material: "ASTM A106 Gr.B",
        additionalSpec: "NACE",
        sizeLabel: '6" SCH 40',
        ends: "BE",
        qtyOrdered: 120.5,
        uom: "Mtr",
        unitRate: 1200,
        amount: 144600,
      },
    ],
  },
  poAcceptance: {
    acceptanceNo: "POA/26/0021",
    status: "ACCEPTED",
    acceptanceDate: "2026-06-01",
    committedDeliveryDate: "2026-08-30",
    createdBy: { name: "R. Kulkarni" },
    followUpName: "A. Nair",
    followUpEmail: "nair@example.com",
    followUpPhone: "+91 98200 11111",
    qualityName: "P. Rao",
    qualityEmail: "rao@example.com",
    qualityPhone: "+91 98200 22222",
    accountsName: "M. Shah",
    accountsEmail: "shah@example.com",
    accountsPhone: "+91 98200 33333",
    remarks: "Confirmed by email.",
  },
  mtcs: [
    {
      mtcNo: "NPFI/MTC/26/0451",
      heatNo: "H-88214",
      stockProduct: "Seamless Pipe",
      stockSize: '6" SCH 40',
      uploadDate: "2026-08-01",
      verificationStatus: "VERIFIED",
      remarks: "",
    },
    {
      mtcNo: "NPFI/MTC/26/0452",
      stockHeatNo: "H-88215",
      stockProduct: "BW Fitting",
      stockSize: '8" SCH 80',
      uploadDate: "2026-08-02",
      verificationStatus: "DISCREPANT",
      remarks: "Chemistry re-check",
    },
  ],
  inspections: [
    {
      inspectionNo: "INS/26/0101",
      stockHeatNo: "H-88214",
      stockProduct: "Seamless Pipe",
      stockSize: '6" SCH 40',
      inspectionDate: "2026-08-05",
      overallResult: "PASS",
      remarks: "",
      tpiAgencyId: null,
      parameters: [
        {
          parameterName: "Dimensional",
          parameterType: "Visual",
          standardValue: "B36.10",
          tolerance: "+/- 1%",
          resultValue: "OK",
          result: "PASS",
        },
      ],
    },
    {
      inspectionNo: "INS/26/0102",
      stockHeatNo: "H-88215",
      inspectionDate: "2026-08-06",
      overallResult: "PASS",
      tpiAgencyId: "tpi-1",
      tpiAgency: { name: "TUV India" },
      tpiSignOffPaths: ["/uploads/signoff.pdf"],
      parameters: [
        {
          parameterName: "Hydro Test",
          standardValue: "50 bar",
          resultValue: "50 bar",
          result: "PASS",
        },
      ],
    },
  ],
  tpiInspections: [],
  labReports: [
    {
      reportNo: "LAB/26/0077",
      reportType: "CHEMICAL",
      heatNo: "H-88214",
      stockProduct: "Seamless Pipe",
      stockSize: '6" SCH 40',
      labName: "Metallurgical Testing Services",
      testDate: "2026-08-04",
      result: "PASS",
    },
  ],
  pipeDetails: [
    {
      pipeNo: 1,
      length: 6.05,
      make: "Jindal",
      mtcNo: "NPFI/MTC/26/0451",
      bundleNo: "B-01",
      remarks: "",
      heatNo: "H-88214",
      stockProduct: "Seamless Pipe",
      stockSize: '6" SCH 40',
      stockSpec: "ASTM A106",
    },
    {
      pipeNo: 2,
      length: 6.1,
      make: "Jindal",
      mtcNo: "NPFI/MTC/26/0451",
      bundleNo: "B-01",
      heatNo: "H-88214",
    },
  ],
  packingListItems: [
    {
      heatNo: "H-88214",
      sizeLabel: '6" SCH 40',
      material: "ASTM A106 Gr.B",
      quantityMtr: 120.5,
      pieces: 20,
      bundleNo: "B-01",
      grossWeightKg: 1450.25,
      netWeightKg: 1400,
      markingDetails: "NPS/L&T/PO-99120",
      inventoryStockId: "stock-1",
      inventoryStock: { product: "Seamless Pipe", heatNo: "H-88214" },
    },
  ],
  qcReleases: [{ inventoryStockId: "stock-1" }],
  invoice: {
    invoiceNo: "INV/26/0311",
    invoiceDate: "2026-08-23",
    invoiceType: "TAX",
    status: "PAID",
    customerGstin: "27AABCL1234M1Z9",
    eWayBillNo: "391004512233",
    dueDate: "2026-09-22",
    subtotal: 240000,
    cgst: 21600,
    sgst: 21600,
    igst: 0,
    tcsAmount: 0,
    roundOff: 0,
    totalAmount: 283200,
    amountInWords: "Rupees Two Lakh Eighty Three Thousand Two Hundred Only",
    items: [
      {
        sNo: 1,
        description: 'Seamless Pipe 6" SCH 40',
        heatNo: "H-88214",
        sizeLabel: '6" SCH 40',
        quantity: 120.5,
        uom: "Mtr",
        unitRate: 1200,
        amount: 144600,
        hsnCode: "73043190",
      },
    ],
  },
};

/** Same dispatch note, but nothing downstream has been produced yet. */
const empty: DossierData = {
  dispatchNote: { dnNo: "DN/26/0089" },
  customer: null,
  salesOrder: null,
  clientPO: null,
  poAcceptance: null,
  mtcs: [],
  inspections: [],
  tpiInspections: [],
  labReports: [],
  pipeDetails: [],
  packingListItems: [],
  qcReleases: [],
  invoice: null,
};

const render = (data: DossierData, sections: DossierSection[]) =>
  renderToBuffer(
    React.createElement(DossierDocument, { data, company, sections }) as never
  );

describe("DossierDocument", () => {
  it("renders every section with data", async () => {
    const buf = await render(populated, [...ALL_SECTIONS]);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(3000);
  });

  it("renders every section with nothing to report", async () => {
    const buf = await render(empty, [...ALL_SECTIONS]);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders each section on its own", async () => {
    // Isolates a fault to one page instead of hiding it behind the others.
    for (const section of ALL_SECTIONS) {
      const buf = await render(populated, [section]);
      expect(buf.subarray(0, 4).toString(), `section ${section}`).toBe("%PDF");
    }
  });

  it("renders the dispatch-note bundle's section list", async () => {
    const buf = await render(populated, [...BUNDLE_SECTIONS]);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("keeps dispatchNote out of the dossier default", () => {
    // Adding it would silently change every dossier already going to
    // customers; the bundle asks for that page explicitly instead.
    expect(DOSSIER_SECTIONS).not.toContain("dispatchNote");
    expect(BUNDLE_SECTIONS).toContain("dispatchNote");
  });
});
