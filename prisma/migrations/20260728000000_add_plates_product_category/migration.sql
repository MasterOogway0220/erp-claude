-- AlterEnum: add PLATES to ProductCategory (ProductSpecMaster.category is the
-- only column using it). Hand-written: this host blocks the shadow DB that
-- `prisma migrate dev` needs, so migrations are authored then `migrate deploy`d.
ALTER TABLE `ProductSpecMaster` MODIFY `category` ENUM('PIPES', 'FITTINGS', 'FLANGES', 'VALVES', 'NUT_BOLT', 'GASKETS', 'PLATES') NULL;
