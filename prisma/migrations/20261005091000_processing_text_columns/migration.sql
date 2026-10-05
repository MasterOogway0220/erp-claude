-- Order processing free-text fields that hold pasted specification clauses.
-- At VARCHAR(191) the live MySQL (non-strict mode) silently cut anything
-- longer to 191 characters on save. Widening keeps every existing value.
-- Hand-written: this host blocks the shadow DB that `prisma migrate dev`
-- needs, so migrations are authored then `migrate deploy`d.

ALTER TABLE `OrderProcessingItem`
  MODIFY `otherLabTests` TEXT NULL,
  MODIFY `additionalSpec` TEXT NULL;
