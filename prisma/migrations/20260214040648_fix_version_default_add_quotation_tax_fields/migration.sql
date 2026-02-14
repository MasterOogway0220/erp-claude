-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "version" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "amountInWords" TEXT,
ADD COLUMN     "grandTotal" DECIMAL(14,2),
ADD COLUMN     "subtotal" DECIMAL(14,2),
ADD COLUMN     "taxAmount" DECIMAL(14,2),
ADD COLUMN     "taxRate" DECIMAL(5,2),
ALTER COLUMN "version" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "taxRate" DECIMAL(5,2);
