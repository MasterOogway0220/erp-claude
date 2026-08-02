-- AddColumn: ClientPurchaseOrder.dispatchAddressId — the site the material
-- ships to, picked at PO registration from the customer's saved dispatch
-- addresses. Additive and nullable; existing POs keep their free-text
-- shipmentAddress. Hand-written: this host blocks the shadow DB that
-- `prisma migrate dev` needs, so migrations are authored then `migrate deploy`d.
ALTER TABLE `ClientPurchaseOrder` ADD COLUMN `dispatchAddressId` VARCHAR(191) NULL;

CREATE INDEX `ClientPurchaseOrder_dispatchAddressId_idx` ON `ClientPurchaseOrder`(`dispatchAddressId`);

ALTER TABLE `ClientPurchaseOrder`
  ADD CONSTRAINT `ClientPurchaseOrder_dispatchAddressId_fkey`
  FOREIGN KEY (`dispatchAddressId`) REFERENCES `CustomerDispatchAddress`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
