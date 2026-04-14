-- CreateTable
CREATE TABLE `InspectionPrep` (
    `id` VARCHAR(191) NOT NULL,
    `prepNo` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NULL,
    `warehouseIntimationId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `companyId` VARCHAR(191) NULL,
    `preparedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InspectionPrep_prepNo_key`(`prepNo`),
    INDEX `InspectionPrep_companyId_idx`(`companyId`),
    INDEX `InspectionPrep_poId_idx`(`poId`),
    INDEX `InspectionPrep_warehouseIntimationId_idx`(`warehouseIntimationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspectionPrepItem` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionPrepId` VARCHAR(191) NOT NULL,
    `poItemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sizeLabel` VARCHAR(191) NULL,
    `uom` VARCHAR(191) NULL,
    `make` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InspectionPrepItem_inspectionPrepId_idx`(`inspectionPrepId`),
    INDEX `InspectionPrepItem_poItemId_idx`(`poItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HeatEntry` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionPrepItemId` VARCHAR(191) NOT NULL,
    `heatNo` VARCHAR(191) NOT NULL,
    `lengthMtr` DECIMAL(10, 3) NULL,
    `pieces` INTEGER NULL,
    `make` VARCHAR(191) NULL,
    `addedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HeatEntry_inspectionPrepItemId_heatNo_key`(`inspectionPrepItemId`, `heatNo`),
    INDEX `HeatEntry_inspectionPrepItemId_idx`(`inspectionPrepItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HeatMTCDocument` (
    `id` VARCHAR(191) NOT NULL,
    `heatEntryId` VARCHAR(191) NOT NULL,
    `mtcNo` VARCHAR(191) NOT NULL,
    `mtcDate` DATETIME(3) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `addedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HeatMTCDocument_heatEntryId_idx`(`heatEntryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspectionOfferItemHeat` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionOfferItemId` VARCHAR(191) NOT NULL,
    `heatEntryId` VARCHAR(191) NOT NULL,
    `piecesSelected` INTEGER NULL,

    UNIQUE INDEX `InspectionOfferItemHeat_inspectionOfferItemId_heatEntryId_key`(`inspectionOfferItemId`, `heatEntryId`),
    INDEX `InspectionOfferItemHeat_inspectionOfferItemId_idx`(`inspectionOfferItemId`),
    INDEX `InspectionOfferItemHeat_heatEntryId_idx`(`heatEntryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: InspectionOffer - add new columns
ALTER TABLE `InspectionOffer`
    ADD COLUMN `inspectionPrepId` VARCHAR(191) NULL,
    ADD COLUMN `approvedById` VARCHAR(191) NULL,
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectedById` VARCHAR(191) NULL,
    ADD COLUMN `rejectedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectionRemarks` TEXT NULL,
    ADD COLUMN `sentAt` DATETIME(3) NULL,
    ADD COLUMN `tpiSignedAt` DATETIME(3) NULL;

-- AlterTable: InspectionOfferItem - add piecesSelected
ALTER TABLE `InspectionOfferItem`
    ADD COLUMN `piecesSelected` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `InspectionPrep` ADD CONSTRAINT `InspectionPrep_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `CompanyMaster`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionPrep` ADD CONSTRAINT `InspectionPrep_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionPrep` ADD CONSTRAINT `InspectionPrep_warehouseIntimationId_fkey` FOREIGN KEY (`warehouseIntimationId`) REFERENCES `WarehouseIntimation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionPrep` ADD CONSTRAINT `InspectionPrep_preparedById_fkey` FOREIGN KEY (`preparedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionPrepItem` ADD CONSTRAINT `InspectionPrepItem_inspectionPrepId_fkey` FOREIGN KEY (`inspectionPrepId`) REFERENCES `InspectionPrep`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionPrepItem` ADD CONSTRAINT `InspectionPrepItem_poItemId_fkey` FOREIGN KEY (`poItemId`) REFERENCES `POItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HeatEntry` ADD CONSTRAINT `HeatEntry_inspectionPrepItemId_fkey` FOREIGN KEY (`inspectionPrepItemId`) REFERENCES `InspectionPrepItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HeatEntry` ADD CONSTRAINT `HeatEntry_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HeatMTCDocument` ADD CONSTRAINT `HeatMTCDocument_heatEntryId_fkey` FOREIGN KEY (`heatEntryId`) REFERENCES `HeatEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HeatMTCDocument` ADD CONSTRAINT `HeatMTCDocument_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOfferItemHeat` ADD CONSTRAINT `InspectionOfferItemHeat_inspectionOfferItemId_fkey` FOREIGN KEY (`inspectionOfferItemId`) REFERENCES `InspectionOfferItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOfferItemHeat` ADD CONSTRAINT `InspectionOfferItemHeat_heatEntryId_fkey` FOREIGN KEY (`heatEntryId`) REFERENCES `HeatEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOffer` ADD CONSTRAINT `InspectionOffer_inspectionPrepId_fkey` FOREIGN KEY (`inspectionPrepId`) REFERENCES `InspectionPrep`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOffer` ADD CONSTRAINT `InspectionOffer_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionOffer` ADD CONSTRAINT `InspectionOffer_rejectedById_fkey` FOREIGN KEY (`rejectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
