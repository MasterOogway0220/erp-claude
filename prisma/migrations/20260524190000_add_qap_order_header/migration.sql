-- Order-level QAP (Quality Assurance Plan) header — PRD §7
ALTER TABLE `SalesOrder`
  ADD COLUMN `qapInspectionRequired` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `qapInspectionLocation` VARCHAR(191) NULL,
  ADD COLUMN `qapTpiAgencyId` VARCHAR(191) NULL,
  ADD COLUMN `qapDocumentPath` VARCHAR(191) NULL,
  ADD COLUMN `qapProposedInspectionDate` DATETIME(3) NULL,
  ADD COLUMN `qapRemarks` TEXT NULL;

CREATE INDEX `SalesOrder_qapTpiAgencyId_idx` ON `SalesOrder`(`qapTpiAgencyId`);

ALTER TABLE `SalesOrder`
  ADD CONSTRAINT `SalesOrder_qapTpiAgencyId_fkey`
  FOREIGN KEY (`qapTpiAgencyId`) REFERENCES `InspectionAgencyMaster`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
