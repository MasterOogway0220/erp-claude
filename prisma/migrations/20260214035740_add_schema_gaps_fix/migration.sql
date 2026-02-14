-- AlterEnum
ALTER TYPE "SOStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "DispatchNote" ADD COLUMN     "lrDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GoodsReceiptNote" ADD COLUMN     "challanDate" TIMESTAMP(3),
ADD COLUMN     "challanNo" TEXT,
ADD COLUMN     "transporterName" TEXT,
ADD COLUMN     "vehicleNo" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountInWords" TEXT,
ADD COLUMN     "customerGstin" TEXT,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "roundOff" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tcsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "uom" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;

-- AlterTable
ALTER TABLE "PurchaseRequisition" ADD COLUMN     "approvalRemarks" TEXT,
ADD COLUMN     "requestedById" TEXT;

-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN     "heatNo" TEXT,
ADD COLUMN     "itemStatus" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "qtyDispatched" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
