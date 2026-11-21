import { describe, expect, it } from "vitest";
import {
  isOrderableTender,
  organisationKey,
  organisationSearchWord,
  pickOrderQuotation,
  quotationItemsFromTender,
  tenderMatchesCustomer,
} from "./order-quotation";

const customer = { id: "c1", name: "Reliance Industries Ltd" };

describe("tenderMatchesCustomer", () => {
  it("uses the tender's client when one is set", () => {
    expect(tenderMatchesCustomer({ customerId: "c1", organization: "Someone else" }, customer)).toBe(true);
    expect(tenderMatchesCustomer({ customerId: "c2", organization: "Reliance Industries Ltd" }, customer)).toBe(false);
  });
  it("falls back to the organisation name, ignoring case and spacing", () => {
    expect(tenderMatchesCustomer({ customerId: null, organization: " reliance  industries ltd" }, customer)).toBe(true);
    expect(tenderMatchesCustomer({ customerId: null, organization: "Reliance" }, customer)).toBe(false);
    expect(tenderMatchesCustomer({ customerId: null, organization: null }, customer)).toBe(false);
  });
});

describe("organisationKey", () => {
  it("treats the hand-typed variants of one client as the same", () => {
    const k = organisationKey("HPCL-Mittal Energy Limited");
    for (const v of ["HPCL - Mittal Energy Limited", "HPCL Mittal Energy Ltd.", "M/s. HPCL-Mittal Energy Limited", "hpcl mittal energy limited"]) {
      expect(organisationKey(v)).toBe(k);
    }
  });
  it("keeps different companies apart", () => {
    expect(organisationKey("Haldia Petrochemicals Limited")).not.toBe(organisationKey("HPCL-Mittal Energy Limited"));
    expect(organisationKey("")).toBe("");
  });
  it("narrows the SQL search on the first real word", () => {
    expect(organisationSearchWord("M/s. Haldia Petrochemicals Ltd")).toBe("Haldia");
    expect(organisationSearchWord("HPCL-Mittal Energy Limited")).toBe("HPCL");
  });
});

describe("isOrderableTender", () => {
  it("rejects only no-bid and lost tenders", () => {
    expect(isOrderableTender("WON")).toBe(true);
    expect(isOrderableTender("IDENTIFIED")).toBe(true);
    expect(isOrderableTender("NO_BID")).toBe(false);
    expect(isOrderableTender("LOST")).toBe(false);
  });
});

describe("pickOrderQuotation", () => {
  const q = (status: string, day: number, version = 0) => ({ status, version, quotationDate: new Date(2026, 10, day) });
  it("uses the newest quotation the client was given", () => {
    const newest = q("APPROVED", 10);
    expect(pickOrderQuotation([q("APPROVED", 1), newest, q("DRAFT", 20)]).use).toBe(newest);
  });
  it("reports a draft instead of building a second quotation", () => {
    const draft = q("DRAFT", 5);
    expect(pickOrderQuotation([draft])).toEqual({ use: null, blockedBy: draft });
  });
  it("ignores superseded/revised/cancelled ones", () => {
    expect(pickOrderQuotation([q("SUPERSEDED", 1), q("CANCELLED", 2)])).toEqual({ use: null, blockedBy: null });
  });
});

describe("quotationItemsFromTender", () => {
  it("copies lines in order and keeps unrated lines unpriced", () => {
    const rows = quotationItemsFromTender([
      { sNo: 2, product: "Flange", material: "A105", additionalSpec: null, sizeLabel: '2"', quantity: 4, uom: "Nos", estimatedRate: null, amount: null, remarks: null },
      { sNo: 1, product: "Pipe", material: "A106 B", additionalSpec: "NACE", sizeLabel: '2" SCH 40', quantity: 10, uom: "Mtr", estimatedRate: 250, amount: null, remarks: "r" },
    ]);
    expect(rows.map((r) => r.product)).toEqual(["Pipe", "Flange"]);
    expect(rows[0]).toMatchObject({ sNo: 1, unitRate: 250, amount: 2500, additionalSpec: "NACE", remark: "r" });
    expect(rows[1]).toMatchObject({ sNo: 2, unitRate: null, amount: 0 });
  });
});
