-- Order Processing gap closure (ORDER_PROCESSING_GAP_ANALYSIS.txt P1-P8).
-- All additive and nullable; no existing row changes meaning.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

-- P5 — the order-specific client contact (email + phone) and the billing party.
ALTER TABLE `ClientPurchaseOrder`
  ADD COLUMN `contactEmail` VARCHAR(191) NULL,
  ADD COLUMN `contactPhone` VARCHAR(191) NULL,
  ADD COLUMN `billingAddressId` VARCHAR(191) NULL,
  -- P6 — the client's signed P.O. copy, scanned in at registration.
  ADD COLUMN `clientPoDocumentPath` VARCHAR(191) NULL,
  ADD COLUMN `clientPoDocumentName` VARCHAR(191) NULL;

CREATE INDEX `ClientPurchaseOrder_billingAddressId_idx` ON `ClientPurchaseOrder`(`billingAddressId`);

ALTER TABLE `ClientPurchaseOrder`
  ADD CONSTRAINT `ClientPurchaseOrder_billingAddressId_fkey`
  FOREIGN KEY (`billingAddressId`) REFERENCES `CustomerDispatchAddress`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- P3 — a quantity change now needs a justification, the way a rate change does.
ALTER TABLE `ClientPOItem` ADD COLUMN `qtyRemark` TEXT NULL;

-- P8 — carry the client's own line number and item code onto the sales order
-- so Order Processing stops asking for them a second time.
ALTER TABLE `SalesOrderItem`
  ADD COLUMN `poSlNo` VARCHAR(191) NULL,
  ADD COLUMN `poItemCode` VARCHAR(191) NULL;

-- P7 — order-level inspection regime (TPI/Client QA vs in-house NPIPE QA).
ALTER TABLE `SalesOrder` ADD COLUMN `orderInspectionType` VARCHAR(191) NULL;

-- P6 — "other test" free text, and a spec the product must comply with.
ALTER TABLE `OrderProcessingItem`
  ADD COLUMN `otherLabTests` VARCHAR(191) NULL,
  ADD COLUMN `additionalSpec` VARCHAR(191) NULL;

-- P1 — the technical requirement set carried onto the purchase requisition.
ALTER TABLE `PRItem` ADD COLUMN `technicalRequirements` TEXT NULL;
