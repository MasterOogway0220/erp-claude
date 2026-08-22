/**
 * How to read a purchase-requisition line for display.
 *
 * An RFQ has no items of its own — it and the vendor-quotation screen both
 * render the requisition's. A `PRItem` carries
 * `product / material / additionalSpec / sizeLabel / uom`, but those screens
 * were reading `itemName / name / specification / description / unit`, none of
 * which exist on it: every item showed blank, and a vendor quotation saved
 * against the RFQ recorded no product at all.
 *
 * One reader, used by both screens, so they cannot drift apart again.
 */
export interface PrItemDisplay {
  /** The product, e.g. "C.S. SEAMLESS PIPE". */
  name: string;
  /** Material / additional spec / size, joined — what the vendor quotes against. */
  spec: string;
  /** Unit of measure, e.g. "MTR". */
  unit: string;
}

export function prItemFields(item: any): PrItemDisplay {
  return {
    name: item?.product || item?.itemName || item?.name || "",
    spec:
      [item?.material, item?.additionalSpec, item?.sizeLabel]
        .filter(Boolean)
        .join(" / ") ||
      item?.specification ||
      item?.description ||
      "",
    unit: item?.uom || item?.unit || "",
  };
}

/** The single-line label used where there is only room for one column. */
export function prItemLabel(item: any): string {
  const f = prItemFields(item);
  return [f.name, f.spec].filter(Boolean).join(" — ");
}
