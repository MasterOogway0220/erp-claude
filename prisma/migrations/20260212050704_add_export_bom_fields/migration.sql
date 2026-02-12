-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "eWayBillNo" TEXT;

-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "certificateReq" TEXT,
ADD COLUMN     "itemDescription" TEXT;
