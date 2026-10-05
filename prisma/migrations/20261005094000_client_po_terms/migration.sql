-- The client PO's own terms and conditions, copied from the quotation's offer
-- terms at registration and then edited, added to or removed for the order.
-- New table; nothing existing changes.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

CREATE TABLE `ClientPOTerm` (
    `id` VARCHAR(191) NOT NULL,
    `clientPurchaseOrderId` VARCHAR(191) NOT NULL,
    `termNo` INTEGER NOT NULL,
    `termName` VARCHAR(191) NOT NULL,
    `termValue` TEXT NOT NULL,
    `isIncluded` BOOLEAN NOT NULL DEFAULT true,

    INDEX `ClientPOTerm_clientPurchaseOrderId_idx`(`clientPurchaseOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientPOTerm`
  ADD CONSTRAINT `ClientPOTerm_clientPurchaseOrderId_fkey`
  FOREIGN KEY (`clientPurchaseOrderId`) REFERENCES `ClientPurchaseOrder`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
