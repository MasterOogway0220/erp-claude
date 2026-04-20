/** Add to any Prisma `where` clause to exclude soft-deleted records. */
export const notDeleted = { deletedAt: null } as const;

/**
 * Returns the data payload for a soft delete operation.
 * Pass hasIsActive=true for models that also have an isActive Boolean field.
 */
export function softDeleteData(hasIsActive = false) {
  return {
    deletedAt: new Date(),
    ...(hasIsActive ? { isActive: false } : {}),
  };
}
