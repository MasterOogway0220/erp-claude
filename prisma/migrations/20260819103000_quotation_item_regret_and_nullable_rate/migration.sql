-- A quotation line now distinguishes three states that used to collapse into
-- one stored 0:
--   unitRate NULL     -> nobody has priced this line yet (blocks approval)
--   unitRate 0        -> deliberately quoted at zero (free / included elsewhere)
--   isRegret = 1      -> we decline to quote this line; the PDF prints REGRET
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev` needs.
ALTER TABLE `QuotationItem`
  MODIFY COLUMN `unitRate` DECIMAL(12, 2) NULL,
  ADD COLUMN `isRegret` BOOLEAN NOT NULL DEFAULT false;

-- Every existing 0 was an unpriced draft line — a real zero price could not be
-- saved before this change — so carry them over as NULL and keep the price
-- gate behaving exactly as it did.
UPDATE `QuotationItem` SET `unitRate` = NULL WHERE `unitRate` = 0;
