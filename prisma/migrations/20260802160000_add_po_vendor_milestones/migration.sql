-- AlterEnum: POStatus gains the vendor-reported milestones from the purchase
-- workflow document — Acknowledged, In Production, Ready for Dispatch. The
-- order previously jumped from SENT_TO_VENDOR straight to received, so there
-- was no way to see whether a vendor had accepted or started manufacturing.
-- Additive only; every existing value keeps its position, so stored rows are
-- untouched. Hand-written: this host blocks the shadow DB `migrate dev` needs.
ALTER TABLE `PurchaseOrder` MODIFY `status` ENUM(
  'DRAFT',
  'PENDING_APPROVAL',
  'OPEN',
  'SENT_TO_VENDOR',
  'ACKNOWLEDGED',
  'IN_PRODUCTION',
  'READY_FOR_DISPATCH',
  'PARTIALLY_RECEIVED',
  'FULLY_RECEIVED',
  'CLOSED',
  'CANCELLED'
) NOT NULL DEFAULT 'DRAFT';
