-- AlterTable: POAcceptance — Step 2 (PRD §3)
-- Add commercial/charge fields, drop unused attachmentUrl

ALTER TABLE `POAcceptance`
  ADD COLUMN `acceptanceDetails`       TEXT NULL,
  ADD COLUMN `wizardStep`              INT NOT NULL DEFAULT 1,
  ADD COLUMN `pdfGeneratedAt`          DATETIME(3) NULL,
  ADD COLUMN `gstRate`                 DECIMAL(5, 2) NULL,
  ADD COLUMN `isInterState`            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `freight`                 DECIMAL(14, 2) NULL,
  ADD COLUMN `freightTaxApplicable`    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `packingForwarding`       DECIMAL(14, 2) NULL,
  ADD COLUMN `packingTaxApplicable`    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `insurance`               DECIMAL(14, 2) NULL,
  ADD COLUMN `insuranceTaxApplicable`  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `otherCharges`            DECIMAL(14, 2) NULL,
  ADD COLUMN `otherChargesTaxApplicable` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `testingCharges`          DECIMAL(14, 2) NULL,
  ADD COLUMN `testingTaxApplicable`    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `tpiCharges`              DECIMAL(14, 2) NULL,
  ADD COLUMN `tpiTaxApplicable`        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `additionalChargesTotal`  DECIMAL(14, 2) NULL,
  ADD COLUMN `subtotal`                DECIMAL(14, 2) NULL,
  ADD COLUMN `taxableAmount`           DECIMAL(14, 2) NULL,
  ADD COLUMN `cgst`                    DECIMAL(14, 2) NULL,
  ADD COLUMN `sgst`                    DECIMAL(14, 2) NULL,
  ADD COLUMN `igst`                    DECIMAL(14, 2) NULL,
  ADD COLUMN `roundOff`                DECIMAL(10, 2) NULL,
  ADD COLUMN `grandTotal`              DECIMAL(14, 2) NULL;

ALTER TABLE `POAcceptance` DROP COLUMN `attachmentUrl`;
