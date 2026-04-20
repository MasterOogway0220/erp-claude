-- Add deletedAt column for soft-delete functionality to 17 models
ALTER TABLE `CompanyMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `CustomerDispatchAddress` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `DimensionalStandardMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `HeatEntry` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `HeatMTCDocument` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `LabReport` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `LengthMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `MaterialCodeMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `PipeMaterialDetail` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `ProductSpecMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Quotation` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `SizeMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `StockReservation` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `SupplierQuotationDocument` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `TenderDocument` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `TestingMaster` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `WarehouseItemDetail` ADD COLUMN `deletedAt` DATETIME(3) NULL;
