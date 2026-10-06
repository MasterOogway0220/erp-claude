-- 2026-10-06 live-test follow-up: the quotation line each sales order line
-- came from, so the order Review step compares a split client PO line
-- (100 + 20 of a quoted 120) or a part order with the right quoted line
-- instead of pairing lines by serial number.
-- Additive and nullable; existing rows keep NULL and the old pairing by S.No.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `SalesOrderItem` ADD COLUMN `quotationItemId` VARCHAR(191) NULL;

CREATE INDEX `SalesOrderItem_quotationItemId_idx` ON `SalesOrderItem`(`quotationItemId`);

ALTER TABLE `SalesOrderItem`
  ADD CONSTRAINT `SalesOrderItem_quotationItemId_fkey`
  FOREIGN KEY (`quotationItemId`) REFERENCES `QuotationItem`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
