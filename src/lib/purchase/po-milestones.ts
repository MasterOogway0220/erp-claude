// Vendor-reported stages of a purchase order, from the purchase workflow
// document: Issued -> Acknowledged -> In Production -> Ready for Dispatch ->
// Delivered. Delivery is not in this list — it is driven by the GRN, not by
// someone clicking a button.

export const VENDOR_MILESTONES = [
  { status: "ACKNOWLEDGED", label: "Mark Acknowledged" },
  { status: "IN_PRODUCTION", label: "Mark In Production" },
  { status: "READY_FOR_DISPATCH", label: "Mark Ready for Dispatch" },
] as const;

/** The vendor-facing chain in order. Statuses outside it have no milestone. */
export const MILESTONE_ORDER = [
  "SENT_TO_VENDOR",
  "ACKNOWLEDGED",
  "IN_PRODUCTION",
  "READY_FOR_DISPATCH",
];

/**
 * Is `target` a stage this PO has not reached yet? Used to decide which
 * buttons to show. A PO that is still a draft, or already received, closed or
 * cancelled, sits outside the chain and gets none — offering "Mark
 * Acknowledged" on a cancelled order is the bug this prevents.
 */
export function isMilestoneAhead(current: string, target: string): boolean {
  const from = MILESTONE_ORDER.indexOf(current);
  const to = MILESTONE_ORDER.indexOf(target);
  return from >= 0 && to > from;
}
