-- AlterTable
ALTER TABLE "CustomerMaster" ADD COLUMN     "creditDays" INTEGER,
ADD COLUMN     "creditLimit" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "DeliveryTermsMaster" ADD COLUMN     "code" TEXT,
ADD COLUMN     "incoterms" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "InspectionAgencyMaster" ADD COLUMN     "accreditationDetails" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "approvedStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "PaymentTermsMaster" ADD COLUMN     "code" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "followUpNotes" TEXT;

-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "inspectionCost" DECIMAL(12,2),
ADD COLUMN     "logisticsCost" DECIMAL(12,2),
ADD COLUMN     "marginPercentage" DECIMAL(5,2),
ADD COLUMN     "materialCost" DECIMAL(12,2),
ADD COLUMN     "otherCosts" DECIMAL(12,2),
ADD COLUMN     "totalCostPerUnit" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "TaxMaster" ADD COLUMN     "code" TEXT,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "effectiveTo" TIMESTAMP(3),
ADD COLUMN     "hsnCode" TEXT;
