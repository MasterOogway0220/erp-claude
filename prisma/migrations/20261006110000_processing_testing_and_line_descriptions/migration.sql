-- 2026-10-06 sandbox fixes:
--  * who carries out an order line's lab testing (in-house or a TPI agency),
--    separate from tpiType, which says who does the inspection;
--  * a non-standard line's own description on the client PO line and the
--    sales order line (their product reads only "Non-Standard Item").
-- All additive and nullable; no existing row changes meaning.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `OrderProcessingItem`
  ADD COLUMN `labTestingBy` VARCHAR(191) NULL,
  ADD COLUMN `labTestingAgencyId` VARCHAR(191) NULL;

CREATE INDEX `OrderProcessingItem_labTestingAgencyId_idx` ON `OrderProcessingItem`(`labTestingAgencyId`);

ALTER TABLE `OrderProcessingItem`
  ADD CONSTRAINT `OrderProcessingItem_labTestingAgencyId_fkey`
  FOREIGN KEY (`labTestingAgencyId`) REFERENCES `InspectionAgencyMaster`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ClientPOItem` ADD COLUMN `itemDescription` TEXT NULL;

ALTER TABLE `SalesOrderItem` ADD COLUMN `itemDescription` TEXT NULL;
