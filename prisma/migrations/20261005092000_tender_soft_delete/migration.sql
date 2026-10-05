-- Tenders are deleted softly, like quotations: DELETE /api/tenders/[id] sets
-- deletedAt and every tender read filters it. Additive and nullable.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `Tender` ADD COLUMN `deletedAt` DATETIME(3) NULL;
