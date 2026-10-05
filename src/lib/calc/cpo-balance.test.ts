import { describe, expect, it } from "vitest";
import { firstOverBalance } from "./cpo-balance";

// One quoted line can now be split into several client PO lines (different PO
// Sl. No. / item code / CDD). Each part alone may fit the quoted balance while
// the parts together exceed it, so the check sums per quotation item.
describe("firstOverBalance", () => {
  const balance = new Map([["q1", 100], ["q2", 50]]);

  it("passes split lines that together fit the balance", () => {
    expect(
      firstOverBalance(
        [
          { quotationItemId: "q1", qtyOrdered: 60 },
          { quotationItemId: "q1", qtyOrdered: 40 },
          { quotationItemId: "q2", qtyOrdered: 50 },
        ],
        balance
      )
    ).toBeNull();
  });

  it("flags split lines that together exceed the balance", () => {
    expect(
      firstOverBalance(
        [
          { quotationItemId: "q1", qtyOrdered: 60 },
          { quotationItemId: "q1", qtyOrdered: 41 },
        ],
        balance
      )
    ).toEqual({ quotationItemId: "q1", ordered: 101, balance: 100 });
  });

  // Metre quantities carry decimals: 1.1 + 2.2 is 3.3000000000000003 in floats.
  it("accepts decimal splits that sum exactly to the balance", () => {
    expect(
      firstOverBalance(
        [
          { quotationItemId: "q3", qtyOrdered: 1.1 },
          { quotationItemId: "q3", qtyOrdered: 2.2 },
        ],
        new Map([["q3", 3.3]])
      )
    ).toBeNull();
  });

  it("ignores lines whose quotation item is unknown (validated elsewhere)", () => {
    expect(firstOverBalance([{ quotationItemId: "zz", qtyOrdered: 5 }], balance)).toBeNull();
  });
});
