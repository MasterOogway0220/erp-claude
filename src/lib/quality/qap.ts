export const VALID_QAP_LOCATIONS = ["WAREHOUSE", "LAB"] as const;
/**
 * The order-level inspection regime: TPI_CLIENT_QA = inspected by a third-party
 * agency or the client's own QA; INHOUSE_QA = inspected by NPIPE's own QA.
 * Same two values as the per-item TPI type, because the order-level choice is
 * only the default for the items under it.
 */
export const VALID_ORDER_INSPECTION_TYPES = ["TPI_CLIENT_QA", "INHOUSE_QA"] as const;
export type QapLocation = (typeof VALID_QAP_LOCATIONS)[number];
export type MprCheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NA";

export interface QapHeader {
  orderInspectionType?: string | null;
  qapInspectionRequired: boolean;
  qapInspectionLocation: string | null;
  qapTpiAgencyId: string | null;
  qapDocumentPath: string | null;
  qapProposedInspectionDate: Date | string | null;
  qapRemarks: string | null;
}

export interface ItemTestingFlags {
  labTestingRequired?: boolean | null;
  pmiRequired?: boolean | null;
  ndtRequired?: boolean | null;
  vdiRequired?: boolean | null;
  hydroTestRequired?: boolean | null;
}

/** Inspection status comes from order-level QAP; testing from per-item flags. */
export function deriveWarehouseStatuses(
  qapInspectionRequired: boolean,
  item: ItemTestingFlags,
): { inspectionStatus: MprCheckStatus; testingStatus: MprCheckStatus } {
  const anyTesting = !!(
    item.labTestingRequired ||
    item.pmiRequired ||
    item.ndtRequired ||
    item.vdiRequired ||
    item.hydroTestRequired
  );
  return {
    inspectionStatus: qapInspectionRequired ? "PENDING" : "NA",
    testingStatus: anyTesting ? "PENDING" : "NA",
  };
}

/** Map a QAP header to the Inspection-Offer form prefill shape. */
export function qapToOfferPrefill(qap: QapHeader): {
  inspectionLocation: string;
  tpiAgencyId: string;
  proposedInspectionDate: string | null;
} {
  const date = qap.qapProposedInspectionDate
    ? new Date(qap.qapProposedInspectionDate).toISOString()
    : null;
  return {
    inspectionLocation: qap.qapInspectionLocation ?? "",
    tpiAgencyId: qap.qapTpiAgencyId ?? "",
    proposedInspectionDate: date,
  };
}

const blankToNull = (v: unknown): string | null => {
  if (typeof v !== "string") return v == null ? null : String(v);
  const t = v.trim();
  return t === "" ? null : t;
};

/** Validate + normalize the QAP PUT body. Throws on invalid location. */
export function normalizeQapInput(body: Record<string, unknown>): {
  orderInspectionType: string | null;
  qapInspectionRequired: boolean;
  qapInspectionLocation: string | null;
  qapTpiAgencyId: string | null;
  qapDocumentPath: string | null;
  qapProposedInspectionDate: Date | null;
  qapRemarks: string | null;
} {
  const location = blankToNull(body.qapInspectionLocation);
  if (location !== null && !VALID_QAP_LOCATIONS.includes(location as QapLocation)) {
    throw new Error(`Invalid qapInspectionLocation: ${location}`);
  }
  const inspectionType = blankToNull(body.orderInspectionType);
  if (
    inspectionType !== null &&
    !VALID_ORDER_INSPECTION_TYPES.includes(
      inspectionType as (typeof VALID_ORDER_INSPECTION_TYPES)[number]
    )
  ) {
    throw new Error(`Invalid orderInspectionType: ${inspectionType}`);
  }
  const rawDate = blankToNull(body.qapProposedInspectionDate);
  return {
    orderInspectionType: inspectionType,
    qapInspectionRequired: !!body.qapInspectionRequired,
    qapInspectionLocation: location,
    qapTpiAgencyId: blankToNull(body.qapTpiAgencyId),
    qapDocumentPath: blankToNull(body.qapDocumentPath),
    qapProposedInspectionDate: rawDate ? new Date(rawDate) : null,
    qapRemarks: blankToNull(body.qapRemarks),
  };
}
