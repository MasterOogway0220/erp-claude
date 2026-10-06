/**
 * The six additional charges on a client PO. `key` is the amount column and
 * `taxKey` its tax-applicable flag, both as the POST route and the
 * ClientPurchaseOrder model name them. The flag names are not derivable from
 * the amount names (`tpiCharges` / `tpiTaxApplicable`), so they are spelled out.
 */
export interface AdditionalCharge {
  label: string;
  key: string;
  taxKey: string;
  amount: number;
  taxApplicable: boolean;
  // Only for "Others": what the charge is for.
  description?: string;
}

// Tax applicable by default: freight, packing and insurance on a supply of
// goods are part of its taxable value under GST.
export const DEFAULT_CHARGES: AdditionalCharge[] = [
  { label: "Freight", key: "freight", taxKey: "freightTaxApplicable", amount: 0, taxApplicable: true },
  { label: "TPI Charges", key: "tpiCharges", taxKey: "tpiTaxApplicable", amount: 0, taxApplicable: true },
  { label: "Testing Charges", key: "testingCharges", taxKey: "testingTaxApplicable", amount: 0, taxApplicable: true },
  { label: "Packing & Forwarding", key: "packingForwarding", taxKey: "packingTaxApplicable", amount: 0, taxApplicable: true },
  { label: "Insurance", key: "insurance", taxKey: "insuranceTaxApplicable", amount: 0, taxApplicable: true },
  { label: "Others", key: "otherCharges", taxKey: "otherChargesTaxApplicable", amount: 0, taxApplicable: true },
];

/**
 * Flat `{ freight, freightTaxApplicable, ... }` fields for the POST body, plus
 * `otherChargesDescription` (what "Others" is for; null when blank).
 */
export function chargePayload(charges: AdditionalCharge[]): Record<string, number | boolean | string | null> {
  const payload: Record<string, number | boolean | string | null> = {};
  for (const c of charges) {
    payload[c.key] = c.amount || 0;
    payload[c.taxKey] = c.taxApplicable;
  }
  payload.otherChargesDescription =
    charges.find((c) => c.key === "otherCharges")?.description?.trim() || null;
  return payload;
}

/**
 * GST on a client PO, as the POST route stores it. An export — a non-INR order
 * not delivered in India — is zero-rated, so its rate comes back 0 whatever
 * rate the request sent. Otherwise IGST at the full rate across state lines,
 * CGST + SGST at half each within one.
 */
export function cpoGst(o: {
  taxableAmount: number;
  gstRate: number;
  currency: string;
  isDomesticDelivery: boolean;
  isInterState: boolean;
}): { gstRate: number; cgst: number; sgst: number; igst: number } {
  const gstRate = o.currency === "INR" || o.isDomesticDelivery ? o.gstRate : 0;
  if (!(gstRate > 0)) return { gstRate, cgst: 0, sgst: 0, igst: 0 };
  if (o.isInterState) return { gstRate, cgst: 0, sgst: 0, igst: (o.taxableAmount * gstRate) / 100 };
  const half = (o.taxableAmount * gstRate) / 200;
  return { gstRate, cgst: half, sgst: half, igst: 0 };
}
