-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NCRStatus" ADD VALUE 'CORRECTIVE_ACTION_IN_PROGRESS';
ALTER TYPE "NCRStatus" ADD VALUE 'VERIFIED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "POStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "POStatus" ADD VALUE 'SENT_TO_VENDOR';

-- AlterTable
ALTER TABLE "InventoryStock" ADD COLUMN     "warehouseLocationId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "originalInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "NCR" ADD COLUMN     "responsiblePersonId" TEXT,
ADD COLUMN     "targetClosureDate" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "verifiedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "approvalDate" TIMESTAMP(3),
ADD COLUMN     "approvalRemarks" TEXT,
ADD COLUMN     "approvedById" TEXT;

-- CreateTable
CREATE TABLE "WarehouseMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseLocation" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "zone" TEXT,
    "rack" TEXT,
    "bay" TEXT,
    "shelf" TEXT,
    "locationType" TEXT NOT NULL DEFAULT 'GENERAL',
    "capacity" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIssue" (
    "id" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesOrderId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "authorizedById" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIssueItem" (
    "id" TEXT NOT NULL,
    "stockIssueId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "heatNo" TEXT,
    "sizeLabel" TEXT,
    "material" TEXT,
    "quantityMtr" DECIMAL(10,3) NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,

    CONSTRAINT "StockIssueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCRelease" (
    "id" TEXT NOT NULL,
    "releaseNo" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectionId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'ACCEPT',
    "releasedById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QCRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseMaster_code_key" ON "WarehouseMaster"("code");

-- CreateIndex
CREATE INDEX "WarehouseLocation_warehouseId_idx" ON "WarehouseLocation"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockIssue_issueNo_key" ON "StockIssue"("issueNo");

-- CreateIndex
CREATE INDEX "StockIssue_issueNo_idx" ON "StockIssue"("issueNo");

-- CreateIndex
CREATE INDEX "StockIssue_salesOrderId_idx" ON "StockIssue"("salesOrderId");

-- CreateIndex
CREATE INDEX "StockIssueItem_stockIssueId_idx" ON "StockIssueItem"("stockIssueId");

-- CreateIndex
CREATE INDEX "StockIssueItem_inventoryStockId_idx" ON "StockIssueItem"("inventoryStockId");

-- CreateIndex
CREATE UNIQUE INDEX "QCRelease_releaseNo_key" ON "QCRelease"("releaseNo");

-- CreateIndex
CREATE INDEX "QCRelease_releaseNo_idx" ON "QCRelease"("releaseNo");

-- CreateIndex
CREATE INDEX "QCRelease_inspectionId_idx" ON "QCRelease"("inspectionId");

-- CreateIndex
CREATE INDEX "QCRelease_inventoryStockId_idx" ON "QCRelease"("inventoryStockId");

-- CreateIndex
CREATE INDEX "InventoryStock_warehouseLocationId_idx" ON "InventoryStock"("warehouseLocationId");

-- CreateIndex
CREATE INDEX "Invoice_originalInvoiceId_idx" ON "Invoice"("originalInvoiceId");

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_warehouseLocationId_fkey" FOREIGN KEY ("warehouseLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "WarehouseMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssueItem" ADD CONSTRAINT "StockIssueItem_stockIssueId_fkey" FOREIGN KEY ("stockIssueId") REFERENCES "StockIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssueItem" ADD CONSTRAINT "StockIssueItem_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCRelease" ADD CONSTRAINT "QCRelease_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCRelease" ADD CONSTRAINT "QCRelease_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCRelease" ADD CONSTRAINT "QCRelease_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
