import { parseRate } from "@/lib/quotations/pricing";

/**
 * QuotationItem create rows from the line items a quotation form sends (the
 * standard item editor's string-valued fields). Used by quotation create and
 * by a client PO registered against a tender quotation that had no lines, so
 * a line typed on either screen is stored exactly the same way.
 *
 * Callers validate pricing first (normalizeItemPricing); this only maps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function quotationItemRows(items: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any, index: number) => ({
    sNo: index + 1,
    slNo: String(item.slNo ?? "").trim().slice(0, 20) || null,
    product: item.product || null,
    material: item.material || null,
    dimStandard: item.dimStandard || null,
    additionalSpec: item.additionalSpec || null,
    sizeId: item.sizeId || null,
    sizeLabel: item.sizeLabel || null,
    sizeNPS: item.nps ? parseFloat(item.nps) : (item.sizeNPS ? parseFloat(item.sizeNPS) : null),
    schedule: item.schedule || null,
    od: item.od ? parseFloat(item.od) : null,
    wt: item.wt ? parseFloat(item.wt) : null,
    length: item.length || null,
    ends: item.ends || null,
    quantity: parseFloat(item.quantity),
    // null (not 0) when no rate was entered — 0 is a real quoted price
    unitRate: parseRate(item.unitRate),
    isRegret: !!item.isRegret,
    amount: parseFloat(item.amount) || 0,
    delivery: item.delivery || null,
    remark: item.remark || null,
    materialCodeId: item.materialCodeId || null,
    materialCodeLabel: item.materialCodeLabel || null,
    uom: item.uom || null,
    hsnCode: item.hsnCode || null,
    taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
    unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
    totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
    // Internal costing fields
    materialCost: item.materialCost ? parseFloat(item.materialCost) : null,
    logisticsCost: item.logisticsCost ? parseFloat(item.logisticsCost) : null,
    inspectionCost: item.inspectionCost ? parseFloat(item.inspectionCost) : null,
    otherCosts: item.otherCosts ? parseFloat(item.otherCosts) : null,
    totalCostPerUnit: item.totalCostPerUnit ? parseFloat(item.totalCostPerUnit) : null,
    marginPercentage: item.marginPercentage ? parseFloat(item.marginPercentage) : null,
    // Export quotation fields
    tagNo: item.tagNo || null,
    drawingRef: item.drawingRef || null,
    itemDescription: item.itemDescription || null,
    certificateReq: item.certificateReq || null,
    // BOM quotation fields
    itemType: item.itemType || null,
    wtType: item.wtType || null,
    tubeLength: item.tubeLength || null,
    tubeCount: item.tubeCount ? parseInt(item.tubeCount) : null,
    componentPosition: item.componentPosition || null,
    // Past quote/PO references
    pastQuote: item.pastQuote || null,
    pastQuotePrice: item.pastQuotePrice ? parseFloat(item.pastQuotePrice) : null,
    pastPo: item.pastPo || null,
    pastPoPrice: item.pastPoPrice ? parseFloat(item.pastPoPrice) : null,
    // Fitting/Flange references
    fittingId: item.fittingId || null,
    flangeId: item.flangeId || null,
  }));
}
