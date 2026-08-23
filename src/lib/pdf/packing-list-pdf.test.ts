import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PackingListDocument,
  type PackingListCompany,
  type PackingListData,
  type PackingListItem,
} from "./packing-list-pdf";

/**
 * The totals row hard-codes 47% as the sum of the first five column widths,
 * because react-pdf has no colspan. Nothing type-checks that against the
 * column list, so these renders are the guard: a layout whose widths no longer
 * resolve throws here rather than at dispatch.
 */

const company: PackingListCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regState: "Maharashtra",
  regPincode: "400004",
  regCountry: "India",
};

function item(over: Partial<PackingListItem> = {}): PackingListItem {
  return {
    heatNo: "H-88214",
    sizeLabel: '6" SCH 40',
    material: "ASTM A106 Gr.B",
    quantityMtr: 120.5,
    pieces: 20,
    bundleNo: "B-01",
    grossWeightKg: 1450.25,
    netWeightKg: 1400,
    markingDetails: "NPS/L&T/PO-99120",
    inventoryStock: { product: "Seamless Pipe" },
    ...over,
  };
}

const data: PackingListData = {
  plNo: "PL/26/0044",
  plDate: "2026-08-23",
  remarks: "Loaded in container MSKU1234567.",
  salesOrder: {
    soNo: "SO/26/0142",
    customer: {
      name: "Larsen & Toubro",
      addressLine1: "Powai Campus",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400072",
    },
  },
  items: [item(), item({ heatNo: "H-88215", bundleNo: "B-02", pieces: 11 })],
};

const render = (d: PackingListData) =>
  renderToBuffer(
    React.createElement(PackingListDocument, { data: d, company }) as never
  );

describe("PackingListDocument", () => {
  it("renders a populated packing list", async () => {
    const buf = await render(data);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders with no sales order and no weights", async () => {
    // A packing list can be raised against loose stock before weighing, so
    // every weight is null and the whole customer block is absent.
    const buf = await render({
      ...data,
      salesOrder: null,
      remarks: null,
      items: [item({ grossWeightKg: null, netWeightKg: null })],
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders an empty consignment without breaking the totals row", async () => {
    const buf = await render({ ...data, items: [] });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("paginates a long consignment", async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      item({ bundleNo: `B-${i + 1}` })
    );
    const buf = await render({ ...data, items: many });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
