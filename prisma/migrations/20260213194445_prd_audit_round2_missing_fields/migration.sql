-- CreateEnum
CREATE TYPE "EnquiryPriority" AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RequisitionType" AS ENUM ('AGAINST_SO', 'STOCK_REPLENISHMENT', 'EMERGENCY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnquiryMode" ADD VALUE 'TENDER_PORTAL';
ALTER TYPE "EnquiryMode" ADD VALUE 'REFERRAL';

-- AlterEnum
ALTER TYPE "PaymentMode" ADD VALUE 'DD';

-- AlterTable
ALTER TABLE "CustomerMaster" ADD COLUMN     "industrySegment" TEXT,
ADD COLUMN     "pan" TEXT;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "endUser" TEXT,
ADD COLUMN     "expectedClosureDate" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "priority" "EnquiryPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "projectLocation" TEXT,
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "inspectionType" TEXT;

-- AlterTable
ALTER TABLE "MTCDocument" ADD COLUMN     "verificationStatus" TEXT DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PackingListItem" ADD COLUMN     "dimensions" TEXT;

-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN     "chequeDate" TIMESTAMP(3),
ADD COLUMN     "chequeNo" TEXT;

-- AlterTable
ALTER TABLE "PurchaseRequisition" ADD COLUMN     "requisitionType" "RequisitionType" NOT NULL DEFAULT 'AGAINST_SO';

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "deliveryPeriod" TEXT,
ADD COLUMN     "deliveryTermsId" TEXT,
ADD COLUMN     "paymentTermsId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "deliverySchedule" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "projectName" TEXT;

-- AlterTable
ALTER TABLE "VendorMaster" ADD COLUMN     "pan" TEXT;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "PaymentTermsMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_deliveryTermsId_fkey" FOREIGN KEY ("deliveryTermsId") REFERENCES "DeliveryTermsMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
