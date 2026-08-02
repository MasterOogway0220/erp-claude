-- AddColumn: the client's countersigned P.O. Acceptance copy. The order
-- processing flow document asks for "Attachment (Signed copy if needed)" —
-- generatedPath already held our outgoing PDF, but there was nowhere to file
-- their acknowledgement back. Stored via StoredFile, so this holds an
-- /api/files/<id> path. Hand-written: this host blocks the shadow DB that
-- `prisma migrate dev` needs.
ALTER TABLE `POAcceptance`
  ADD COLUMN `signedCopyPath` VARCHAR(191) NULL,
  ADD COLUMN `signedCopyName` VARCHAR(191) NULL,
  ADD COLUMN `signedCopyAt` DATETIME(3) NULL;
