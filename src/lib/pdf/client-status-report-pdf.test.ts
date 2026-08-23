import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  ClientStatusReportDocument,
  type StatusReportCompany,
} from "./client-status-report-pdf";
import type {
  ClientStatusReportData,
  StatusReportItem,
} from "./client-status-report-template";

/**
 * A react-pdf layout error throws at render time, not compile time — a
 * thirteen-column table whose widths do not resolve, or a percentage width on
 * a progress bar, fails only when a customer asks for the report. These render
 * for real so that failure lands here instead.
 */

const company: StatusReportCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regState: "Maharashtra",
  regPincode: "400004",
  telephoneNo: "+91 22 23634200",
  email: "info@n-pipe.com",
};

function item(sNo: number, over: Partial<StatusReportItem> = {}): StatusReportItem {
  return {
    sNo,
    product: "Seamless Pipe",
    material: "ASTM A106 Gr.B",
    size: '6" SCH 40',
    qtyOrdered: 120.5,
    qtyDispatched: 60.25,
    qtyBalance: 60.25,
    materialPrepared: "READY",
    inspectionStatus: "PASS",
    testingStatus: "PENDING",
    heatNo: "H-88214",
    expectedDispatchDate: "12/09/2026",
    remarks: "Awaiting TPI",
    ...over,
  };
}

const report: ClientStatusReportData = {
  reportDate: "2026-08-23",
  customer: {
    name: "Larsen & Toubro",
    contactPerson: "A. Nair",
    addressLine1: "Powai Campus",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400072",
  },
  salesOrder: {
    soNo: "SO/26/0142",
    soDate: "2026-06-01",
    customerPoNo: "PO-99120",
    customerPoDate: "2026-05-28",
    projectName: "Refinery Unit 4",
    deliverySchedule: "Phased, 8 weeks",
    status: "IN_PROGRESS",
  },
  items: [item(1), item(2, { testingStatus: "FAIL", heatNo: "" })],
  summary: {
    totalItems: 2,
    totalOrdered: 241,
    totalDispatched: 120.5,
    totalBalance: 120.5,
    inspectionComplete: 2,
    testingComplete: 0,
    materialReady: 2,
  },
};

function render(data: ClientStatusReportData) {
  return renderToBuffer(
    React.createElement(ClientStatusReportDocument, {
      report: data,
      company,
    }) as never
  );
}

describe("ClientStatusReportDocument", () => {
  it("renders a populated report", async () => {
    const buf = await render(report);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders with no items and a zero-division summary", async () => {
    // Every percentage divides by a summary total. An order with nothing on it
    // must produce 0%, not NaN% and not a crash on a NaN-width progress bar.
    const buf = await render({
      ...report,
      items: [],
      summary: {
        totalItems: 0,
        totalOrdered: 0,
        totalDispatched: 0,
        totalBalance: 0,
        inspectionComplete: 0,
        testingComplete: 0,
        materialReady: 0,
      },
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("spills a long item list onto further pages", async () => {
    // The table header is `fixed` so it repeats; that only matters if a long
    // list actually paginates without throwing.
    const many = Array.from({ length: 60 }, (_, i) => item(i + 1));
    const buf = await render({ ...report, items: many });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
