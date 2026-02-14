-- Add missing QuotationStatus enum values
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add missing Quotation columns (revision tracking)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "revisionTrigger" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "revisionSubReason" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "revisionNotes" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "customerReference" TEXT;

-- Add missing Quotation columns (change tracking)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "changeSnapshot" JSONB;

-- Add missing Quotation columns (expiry management)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "expiryNotified7d" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "expiryNotified3d" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "expiryNotified1d" BOOLEAN NOT NULL DEFAULT false;

-- Add missing Quotation columns (loss tracking)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "lossReason" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "lossCompetitor" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "lossNotes" TEXT;

-- Update unique constraint: drop old unique on quotationNo, add composite unique
DROP INDEX IF EXISTS "Quotation_quotationNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_quotationNo_version_key" ON "Quotation"("quotationNo", "version");

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "Quotation_parentQuotationId_idx" ON "Quotation"("parentQuotationId");
CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status");
CREATE INDEX IF NOT EXISTS "Quotation_validUpto_idx" ON "Quotation"("validUpto");
CREATE INDEX IF NOT EXISTS "Quotation_customerId_status_idx" ON "Quotation"("customerId", "status");
CREATE INDEX IF NOT EXISTS "Quotation_preparedById_status_idx" ON "Quotation"("preparedById", "status");
CREATE INDEX IF NOT EXISTS "Quotation_revisionTrigger_idx" ON "Quotation"("revisionTrigger");
