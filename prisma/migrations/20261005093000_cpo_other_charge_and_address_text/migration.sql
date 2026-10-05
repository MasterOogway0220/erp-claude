-- Client PO registration (03/10/26 meeting):
--  * what the "Others" additional charge is for, on the client PO and on its
--    PO acceptance (the other five charges are named by their column);
--  * a typed one-off billing / dispatch address, used instead of picking a
--    saved customer site (the FK columns stay NULL when text is used).
-- All additive and nullable; no existing row changes meaning.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `ClientPurchaseOrder`
  ADD COLUMN `otherChargesDescription` VARCHAR(191) NULL,
  ADD COLUMN `billingAddressText` TEXT NULL,
  ADD COLUMN `dispatchAddressText` TEXT NULL;

ALTER TABLE `POAcceptance` ADD COLUMN `otherChargesDescription` VARCHAR(191) NULL;
