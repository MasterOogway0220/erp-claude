-- AlterTable: add sourceTenderId to Quotation
ALTER TABLE "Quotation" ADD COLUMN "sourceTenderId" TEXT;

-- AlterTable: add sourceTenderId to SalesOrder
ALTER TABLE "SalesOrder" ADD COLUMN "sourceTenderId" TEXT;

-- AddForeignKey: Quotation -> Tender
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_sourceTenderId_fkey" FOREIGN KEY ("sourceTenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SalesOrder -> Tender
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_sourceTenderId_fkey" FOREIGN KEY ("sourceTenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
