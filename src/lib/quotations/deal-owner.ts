/**
 * Build the Prisma update fragment for Quotation.dealOwnerId from a PUT body.
 *
 * The distinction that matters: a payload that never mentions dealOwnerId is
 * not editing the owner, while a payload that sends null/"" is deliberately
 * unassigning it. Collapsing the two (`dealOwnerId: body.dealOwnerId || null`)
 * is what let ordinary edits silently blank the owner — the same defect that
 * blanked preparedById on six quotations before it was made write-once.
 */
export function dealOwnerPatch(
  dealOwnerId: string | null | undefined
): { dealOwnerId?: string | null } {
  if (dealOwnerId === undefined) return {};
  return { dealOwnerId: dealOwnerId || null };
}
