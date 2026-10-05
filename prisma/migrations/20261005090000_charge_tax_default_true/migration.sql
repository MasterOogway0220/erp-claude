-- Additional charges on a client PO and its acceptance letter default to
-- "tax applicable". Freight, packing and insurance on a supply of goods are
-- part of its taxable value under GST, so false was the wrong default.
-- Column defaults only: no existing row is changed.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `ClientPurchaseOrder`
  ALTER COLUMN `freightTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `tpiTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `testingTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `packingTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `insuranceTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `otherChargesTaxApplicable` SET DEFAULT true;

ALTER TABLE `POAcceptance`
  ALTER COLUMN `freightTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `tpiTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `testingTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `packingTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `insuranceTaxApplicable` SET DEFAULT true,
  ALTER COLUMN `otherChargesTaxApplicable` SET DEFAULT true;
