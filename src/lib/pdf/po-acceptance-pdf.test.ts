import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { POAcceptanceDocument } from "./po-acceptance-pdf";
import {
  generatePOAcceptanceLetterHtml,
  type POAcceptanceData,
  type CompanyInfo,
} from "./po-acceptance-template";

/**
 * The acceptance letter used to be served as HTML under a .pdf filename, which
 * no PDF reader opens. These check the real PDF renders across the shapes the
 * database produces, and that the HTML copy (embedded in the email) carries the
 * same additions: logo, the client's PO line refs, and our follow-up person.
 */

const company: CompanyInfo = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  telephoneNo: "+91 22 23634200",
  email: "info@n-pipe.com",
};

const base: POAcceptanceData = {
  acceptanceNo: "POA/2026-27/00042",
  acceptanceDate: "2026-10-05",
  committedDeliveryDate: "2026-12-15",
  remarks: "Material against your enquiry.",
  followUpName: "R. Shah",
  followUpEmail: "rshah@client.example",
  followUpPhone: "9820000000",
  clientPO: {
    cpoNo: "CPO/2026-27/00013",
    clientPoNumber: "RBL-340/26-27",
    clientPoDate: "2026-09-27",
    projectName: "Thyssenkrupp",
    paymentTerms: "100% advance",
    deliveryTerms: "Ex-works",
    currency: "INR",
    grandTotal: 174304,
  },
  items: [
    {
      sNo: 1,
      poSlNo: "10",
      poItemCode: "PIPE-CS-06-40",
      product: "C.S. SEAMLESS PIPE",
      material: "ASTM A106 Gr.B",
      sizeLabel: '6" SCH 40',
      uom: "Mtr",
      qtyOrdered: 120,
      unitRate: 1200,
      amount: 144000,
    },
  ],
  customer: { name: "Spraytech Systems (India) Pvt. Ltd.", city: "Thane" },
  ourContact: { name: "U C Jain", email: "ucjain@n-pipe.com", phone: "9876543210" },
};

const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

async function pdf(data: POAcceptanceData, c: CompanyInfo = company) {
  return renderToBuffer(
    React.createElement(POAcceptanceDocument, { data, company: c }) as unknown as Parameters<typeof renderToBuffer>[0]
  );
}

describe("POAcceptanceDocument", () => {
  it("renders a real PDF titled with the acceptance number", async () => {
    const buf = await pdf(base);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.toString("latin1")).toContain("POA/2026-27/00042");
  }, 30_000);

  it("survives missing optional fields, no contact and no items", async () => {
    const buf = await pdf({
      ...base,
      remarks: null,
      followUpName: null,
      ourContact: null,
      clientPO: { ...base.clientPO, clientPoDate: null, paymentTerms: null, deliveryTerms: null, grandTotal: null },
      items: [],
    });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  it("renders with a charges and GST summary", async () => {
    const buf = await pdf({ ...base, summary: [{ label: "Material Value", amount: 144000 }, { label: "IGST @ 18%", amount: 25920 }] });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  it("renders with the order's terms list", async () => {
    const buf = await pdf({ ...base, terms: [{ termName: "Price", termValue: "Ex-works Mumbai" }] });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  it("renders a long order across pages", async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ ...base.items[0], sNo: i + 1, poSlNo: String(10 * (i + 1)) }));
    const buf = await pdf({ ...base, items });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 60_000);
});

describe("acceptance letter HTML (email copy)", () => {
  it("prints the logo when the company has one", () => {
    const html = generatePOAcceptanceLetterHtml(base, { ...company, companyLogoUrl: "https://erp.example/uploads/logo.png" });
    expect(html).toContain('<img src="https://erp.example/uploads/logo.png"');
    expect(generatePOAcceptanceLetterHtml(base, company)).not.toContain("<img");
  });

  it("prints the client's PO Sl. No. and item code for each line", () => {
    const text = textOf(generatePOAcceptanceLetterHtml(base, company));
    expect(text).toContain("PO Sl. No.");
    expect(text).toContain("PO Item Code");
    expect(text).toContain("PIPE-CS-06-40");
  });

  it("names our follow-up person in the signature block", () => {
    const text = textOf(generatePOAcceptanceLetterHtml(base, company));
    expect(text).toContain("U C Jain");
    expect(text).toContain("ucjain@n-pipe.com");
    expect(text).toContain("9876543210");
  });

  // The client PO's own terms (copied from the quotation, edited for the order)
  // replace the bare payment/delivery lines when the order has them.
  it("prints the order's terms list when there is one", () => {
    const text = textOf(
      generatePOAcceptanceLetterHtml(
        { ...base, terms: [{ termName: "Price", termValue: "Ex-works Mumbai" }, { termName: "LD Clause", termValue: "0.5% per week" }] },
        company
      )
    );
    expect(text).toContain("Ex-works Mumbai");
    expect(text).toContain("LD Clause");
    expect(text).toContain("0.5% per week");
  });

  // The Total includes charges and GST; the rows above it must show them, or
  // the line amounts and the Total visibly disagree.
  it("prints the charges and GST that make up the total", () => {
    const text = textOf(
      generatePOAcceptanceLetterHtml(
        {
          ...base,
          summary: [
            { label: "Material Value", amount: 144000 },
            { label: "Others — Crane hire", amount: 1700 },
            { label: "CGST @ 9%", amount: 13113 },
            { label: "SGST @ 9%", amount: 13113 },
          ],
        },
        company
      )
    );
    expect(text).toContain("Others — Crane hire");
    expect(text).toContain("CGST @ 9%");
    expect(text).toContain("13,113.00");
  });

  it("keeps the anonymous signatory when there is no contact", () => {
    const text = textOf(generatePOAcceptanceLetterHtml({ ...base, ourContact: null }, company));
    expect(text).toContain("Authorized Signatory");
  });
});
