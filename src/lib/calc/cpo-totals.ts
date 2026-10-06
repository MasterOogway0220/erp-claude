/**
 * An order's totals worked the way the client PO POST route works them: GST on
 * the material value plus only the charges ticked taxable, every charge (taxed
 * or not) in the total, and the total rounded to the rupee with `roundOff` the
 * difference. Figures come back in paise, as the Decimal(_, 2) columns store
 * them, so a screen that shows these saves exactly what it showed.
 *
 * Pass `gstRate` 0 when GST does not apply (an export).
 */
export function cpoTotals(o: {
  subtotal: number;
  charges: { amount: number; taxApplicable: boolean }[];
  gstRate: number;
  isInterState: boolean;
}) {
  const additionalChargesTotal = o.charges.reduce((sum, c) => sum + c.amount, 0);
  const taxableAmount =
    o.subtotal + o.charges.filter((c) => c.taxApplicable).reduce((sum, c) => sum + c.amount, 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (o.gstRate > 0) {
    if (o.isInterState) {
      igst = (taxableAmount * o.gstRate) / 100;
    } else {
      cgst = (taxableAmount * o.gstRate) / 200;
      sgst = cgst;
    }
  }

  // Unrounded GST goes into the total, as on the client PO, so the two agree.
  const unrounded = o.subtotal + additionalChargesTotal + cgst + sgst + igst;
  const grandTotal = Math.round(unrounded);
  // `|| 0`: a total a hair above the rupee gives -0, which prints "+-0.00".
  const paise = (v: number) => +v.toFixed(2) || 0;

  return {
    subtotal: paise(o.subtotal),
    additionalChargesTotal: paise(additionalChargesTotal),
    taxableAmount: paise(taxableAmount),
    cgst: paise(cgst),
    sgst: paise(sgst),
    igst: paise(igst),
    roundOff: paise(grandTotal - unrounded),
    grandTotal,
  };
}
