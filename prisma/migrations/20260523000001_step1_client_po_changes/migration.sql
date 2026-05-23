-- Migration: step1_client_po_changes
-- PRD §2: Register Client P.O. — add delivery/FX fields, drop qtyQuoted, add item tracking fields

-- ClientPurchaseOrder: add 4 new fields
ALTER TABLE `ClientPurchaseOrder` ADD COLUMN `committedDeliveryDate` DATETIME(3) NULL;
ALTER TABLE `ClientPurchaseOrder` ADD COLUMN `isDomesticDelivery` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ClientPurchaseOrder` ADD COLUMN `shipmentAddress` TEXT NULL;
ALTER TABLE `ClientPurchaseOrder` ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL;

-- ClientPOItem: drop qtyQuoted (pre-launch data, approved destructive drop per Decision D3)
ALTER TABLE `ClientPOItem` DROP COLUMN `qtyQuoted`;

-- ClientPOItem: add 3 new item tracking fields
ALTER TABLE `ClientPOItem` ADD COLUMN `poSlNo` VARCHAR(191) NULL;
ALTER TABLE `ClientPOItem` ADD COLUMN `poItemCode` VARCHAR(191) NULL;
ALTER TABLE `ClientPOItem` ADD COLUMN `rateRemark` TEXT NULL;
