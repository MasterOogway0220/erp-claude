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
