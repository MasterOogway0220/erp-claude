/**
 * Shared rule for advancing a Client P.O. when its PO Acceptance is issued.
 *
 * A POA can reach status ISSUED through several routes (the create-wizard
 * `finalize` POST, and the detail-page `PUT`/`PATCH` status updates). All of
 * them must advance the parent CPO consistently — keeping this logic here
 * prevents one path from being fixed while another silently isn't.
 */

/**
 * The CPO status to set once its acceptance is issued, or null for "no change".
 * Only advances from the initial REGISTERED/DRAFT states so we never regress a
 * CPO that has already progressed to (partial/full) fulfilment.
 */
export function cpoStatusAfterIssue(
  currentCpoStatus: string | null | undefined,
): "ACCEPTED" | null {
  return currentCpoStatus === "REGISTERED" || currentCpoStatus === "DRAFT"
    ? "ACCEPTED"
    : null;
}

/** True when a status change represents a fresh transition into ISSUED. */
export function isPoaIssueTransition(
  newStatus: string | null | undefined,
  prevStatus: string | null | undefined,
): boolean {
  return newStatus === "ISSUED" && prevStatus !== "ISSUED";
}
