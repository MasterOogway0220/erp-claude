export type POItem = { qty: number; unitRate: number };
export type POCharges = {
  freight: number;
  packing: number;
  insurance: number;
  other: number;
  testing: number;
  tpi: number;
};

export type POTotalsInput = {
  items: POItem[];
  currency: "INR" | "USD";
  isInternational: boolean;
  isDomesticDelivery: boolean;
  gstRate: number;
  isInterState: boolean;
  charges: POCharges;
};

export type POTotalsResult = {
  subtotal: number;
  additionalChargesTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
};

export function computePOTotals(input: POTotalsInput): POTotalsResult {
  const subtotal = input.items.reduce((sum, item) => sum + item.qty * item.unitRate, 0);
  const additionalChargesTotal =
    input.charges.freight +
    input.charges.packing +
    input.charges.insurance +
    input.charges.other +
    input.charges.testing +
    input.charges.tpi;
  const taxableAmount = subtotal + additionalChargesTotal;

  // GST applies only when GST is in effect:
  //   - Domestic customer (always)
  //   - International customer ONLY when isDomesticDelivery=true
  const gstApplies = !input.isInternational || input.isDomesticDelivery;
  let cgst = 0, sgst = 0, igst = 0;
  if (gstApplies && input.gstRate > 0) {
    if (input.isInterState) {
      igst = +(taxableAmount * input.gstRate / 100).toFixed(2);
    } else {
      const half = +(taxableAmount * input.gstRate / 200).toFixed(2);
      cgst = half;
      sgst = half;
    }
  }

  const grandTotal = +(taxableAmount + cgst + sgst + igst).toFixed(2);

  return { subtotal, additionalChargesTotal, taxableAmount, cgst, sgst, igst, grandTotal };
}
