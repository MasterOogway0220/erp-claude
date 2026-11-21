/**
 * A tender is one of the three kinds of quotation the business sends
 * (standard, non-standard, tender). The client PO module, though, is built on
 * Quotation: a PO line points at a QuotationItem, and the "balance left to
 * order" is worked out from quotation lines. Rather than teach every PO, sales
 * order, dispatch and invoice path a second source, registering a PO against
 * a tender goes through an **order quotation**: a Quotation built from the
 * tender's lines, carrying the tender's own number and linked back to it by
 * `sourceTenderId`. It is made once and reused for every later PO on that
 * tender, so part-orders draw down one balance.
 *
 * This file holds the pure rules; the route is
 * src/app/api/tenders/[id]/order-quotation/route.ts.
 */
import { normalizeMatchValue, wasGivenToClient } from "@/lib/quotations/past-quote-match";

/** Tenders we did not bid on, or lost, can never receive a PO. */
export const NOT_ORDERABLE_TENDER_STATUSES = ["NO_BID", "LOST"] as const;

export function isOrderableTender(status: string | null | undefined): boolean {
  return !(NOT_ORDERABLE_TENDER_STATUSES as readonly string[]).includes(status ?? "");
}

const ORG_WORDS: Record<string, string> = {
  ltd: "limited",
  pvt: "private",
  co: "company",
  corp: "corporation",
  "&": "and",
};

/**
 * A company name reduced to what identifies it. Tender organisations are
 * typed by hand, so the same client appears as "HPCL-Mittal Energy Limited",
 * "HPCL - Mittal Energy Limited" and "HPCL Mittal Energy Ltd.", and older
 * entries carry a "M/s." prefix. Case, punctuation, spacing, the prefix and
 * the usual abbreviations (Ltd, Pvt, Co, Corp, &) are ignored.
 */
export function organisationKey(name: string | null | undefined): string {
  return normalizeMatchValue(name)
    .replace(/^(m\/s\.?|messrs\.?)\s*/, "")
    .split(/[^a-z0-9&]+/)
    .filter(Boolean)
    .map((w) => ORG_WORDS[w] ?? w)
    .join("");
}

/**
 * Is this tender for this client? Its client field decides when set. Most
 * tenders are logged with only the organisation's name, so when no client is
 * set the organisation must name the client (see organisationKey).
 */
export function tenderMatchesCustomer(
  tender: { customerId: string | null; organization: string | null },
  customer: { id: string; name: string }
): boolean {
  if (tender.customerId) return tender.customerId === customer.id;
  const org = organisationKey(tender.organization);
  return org !== "" && org === organisationKey(customer.name);
}

/**
 * A word to narrow the tender search in SQL before the exact rule runs: the
 * client name's first word of three or more letters ("HPCL", "Haldia").
 */
export function organisationSearchWord(name: string): string {
  const word = name.split(/[^A-Za-z0-9]+/).find((w) => w.length >= 3 && !/^m\/?s$/i.test(w));
  return word ?? name.trim();
}

/**
 * Which existing quotation raised from the tender a PO should use: the newest
 * one the client was actually given. One that only exists as a draft (or is
 * pending, rejected or cancelled) cannot be ordered against, and the caller
 * should say so rather than build a second one beside it.
 */
export function pickOrderQuotation<
  Q extends { status: string; version: number; quotationDate: Date }
>(quotations: Q[]): { use: Q | null; blockedBy: Q | null } {
  const live = quotations.filter((q) => q.status !== "SUPERSEDED" && q.status !== "REVISED");
  const given = live
    .filter((q) => wasGivenToClient(q.status))
    .sort((a, b) => b.quotationDate.getTime() - a.quotationDate.getTime() || b.version - a.version);
  if (given.length > 0) return { use: given[0], blockedBy: null };
  const blocked = live.find((q) => q.status === "DRAFT" || q.status === "PENDING_APPROVAL");
  return { use: null, blockedBy: blocked ?? null };
}

type Num = { toString(): string } | number | null;
const toNum = (v: Num) => (v == null ? null : Number(v));

/** QuotationItem create rows from the tender's BOQ lines. */
export function quotationItemsFromTender(
  items: {
    sNo: number;
    product: string | null;
    material: string | null;
    additionalSpec: string | null;
    sizeLabel: string | null;
    quantity: Num;
    uom: string | null;
    estimatedRate: Num;
    amount: Num;
    remarks: string | null;
  }[]
) {
  return [...items]
    .sort((a, b) => a.sNo - b.sNo)
    .map((it, idx) => {
      const quantity = toNum(it.quantity) ?? 0;
      const rate = toNum(it.estimatedRate);
      const amount = toNum(it.amount) ?? (rate != null ? quantity * rate : 0);
      return {
        sNo: idx + 1,
        product: it.product,
        material: it.material,
        additionalSpec: it.additionalSpec,
        sizeLabel: it.sizeLabel,
        quantity,
        uom: it.uom,
        // An unrated tender line stays unpriced (NULL), not a quoted zero; the
        // PO screen's negotiated rate is where the ordered price goes.
        unitRate: rate,
        amount,
        remark: it.remarks,
      };
    });
}
