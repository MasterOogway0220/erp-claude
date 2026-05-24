export const VALID_QAP_LOCATIONS = ["WAREHOUSE", "LAB"] as const;
export type QapLocation = (typeof VALID_QAP_LOCATIONS)[number];
export type MprCheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NA";

export interface QapHeader {
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
  const rawDate = blankToNull(body.qapProposedInspectionDate);
  return {
    qapInspectionRequired: !!body.qapInspectionRequired,
    qapInspectionLocation: location,
    qapTpiAgencyId: blankToNull(body.qapTpiAgencyId),
    qapDocumentPath: blankToNull(body.qapDocumentPath),
    qapProposedInspectionDate: rawDate ? new Date(rawDate) : null,
    qapRemarks: blankToNull(body.qapRemarks),
  };
}
