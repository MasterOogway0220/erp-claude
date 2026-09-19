-- CreateTable: ClientItemMaster — the customer's own item IDs (their SAP /
-- tender line numbers) used on non-standard quotations, one row per
-- customer + item ID. Filled automatically from every saved non-standard
-- quotation; curated on the Material Codes master page. Hand-written: this
-- host blocks the shadow DB that `prisma migrate dev` needs.
CREATE TABLE `ClientItemMaster` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `itemNo` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClientItemMaster_companyId_idx`(`companyId`),
    UNIQUE INDEX `ClientItemMaster_customerId_itemNo_key`(`customerId`, `itemNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientItemMaster` ADD CONSTRAINT `ClientItemMaster_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerMaster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
