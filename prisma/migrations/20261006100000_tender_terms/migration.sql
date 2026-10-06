-- The tender's own terms and conditions (requested 2026-10-06): the same rows
-- as a quotation's offer terms, started from the Offer Terms list or the
-- customer's defaults, edited on the tender, and copied into a quotation raised
-- from it. termValue is VARCHAR(191) like QuotationTerm's so a copy fits.
-- New table; nothing existing changes.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

CREATE TABLE `TenderTerm` (
    `id` VARCHAR(191) NOT NULL,
    `tenderId` VARCHAR(191) NOT NULL,
    `termNo` INTEGER NOT NULL,
    `termName` VARCHAR(191) NOT NULL,
    `termValue` VARCHAR(191) NOT NULL,
    `isIncluded` BOOLEAN NOT NULL DEFAULT true,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,

    INDEX `TenderTerm_tenderId_idx`(`tenderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TenderTerm`
  ADD CONSTRAINT `TenderTerm_tenderId_fkey`
  FOREIGN KEY (`tenderId`) REFERENCES `Tender`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
