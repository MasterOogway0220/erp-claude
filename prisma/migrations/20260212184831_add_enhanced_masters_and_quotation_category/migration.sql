/*
  Warnings:

  - A unique constraint covering the columns `[linkedCustomerId]` on the table `VendorMaster` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('BUYER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "GSTType" AS ENUM ('REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ');

-- CreateEnum
CREATE TYPE "QuotationCategory" AS ENUM ('STANDARD', 'NON_STANDARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT';
ALTER TYPE "AuditAction" ADD VALUE 'SUBMIT_FOR_APPROVAL';
ALTER TYPE "AuditAction" ADD VALUE 'VOID';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'STATUS_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_SENT';

-- AlterTable
ALTER TABLE "CustomerMaster" ADD COLUMN     "companyReferenceCode" TEXT,
ADD COLUMN     "companyType" "CompanyType" NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "contactPersonEmail" TEXT,
ADD COLUMN     "contactPersonPhone" TEXT,
ADD COLUMN     "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "defaultPaymentTermsId" TEXT,
ADD COLUMN     "gstType" "GSTType",
ADD COLUMN     "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "buyerId" TEXT;

-- AlterTable
ALTER TABLE "PipeSizeMaster" ADD COLUMN     "nps" DECIMAL(6,3),
ADD COLUMN     "schedule" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "buyerId" TEXT,
ADD COLUMN     "preparedByEmployeeId" TEXT,
ADD COLUMN     "quotationCategory" "QuotationCategory" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "materialCodeId" TEXT,
ADD COLUMN     "schedule" TEXT,
ADD COLUMN     "sizeNPS" DECIMAL(6,3),
ADD COLUMN     "uom" TEXT;

-- AlterTable
ALTER TABLE "QuotationTerm" ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHeadingEditable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "VendorMaster" ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "approvalDate" TIMESTAMP(3),
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankIfsc" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "gstNo" TEXT,
ADD COLUMN     "gstType" "GSTType",
ADD COLUMN     "linkedCustomerId" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "vendorRating" DECIMAL(3,1);

-- CreateTable
CREATE TABLE "CompanyMaster" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyType" TEXT,
    "regAddressLine1" TEXT,
    "regAddressLine2" TEXT,
    "regCity" TEXT,
    "regPincode" TEXT,
    "regState" TEXT,
    "regCountry" TEXT NOT NULL DEFAULT 'India',
    "whAddressLine1" TEXT,
    "whAddressLine2" TEXT,
    "whCity" TEXT,
    "whPincode" TEXT,
    "whState" TEXT,
    "whCountry" TEXT NOT NULL DEFAULT 'India',
    "panNo" TEXT,
    "tanNo" TEXT,
    "gstNo" TEXT,
    "cinNo" TEXT,
    "telephoneNo" TEXT,
    "email" TEXT,
    "website" TEXT,
    "companyLogoUrl" TEXT,
    "fyStartMonth" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMaster" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "telephone" TEXT,
    "linkedUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerMaster" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "telephone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDispatchAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "consigneeName" TEXT,
    "placeOfSupply" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDispatchAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCodeMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT,
    "materialGrade" TEXT,
    "size" TEXT,
    "schedule" TEXT,
    "firstQuotedDate" TIMESTAMP(3),
    "lastQuotedPrice" DECIMAL(12,2),
    "timesQuoted" INTEGER NOT NULL DEFAULT 0,
    "timesOrdered" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCodeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTermTemplate" (
    "id" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "termDefaultValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isExportOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferTermTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_label_key" ON "FinancialYear"("label");

-- CreateIndex
CREATE INDEX "FinancialYear_isActive_idx" ON "FinancialYear"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMaster_employeeCode_key" ON "EmployeeMaster"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMaster_linkedUserId_key" ON "EmployeeMaster"("linkedUserId");

-- CreateIndex
CREATE INDEX "BuyerMaster_customerId_idx" ON "BuyerMaster"("customerId");

-- CreateIndex
CREATE INDEX "CustomerDispatchAddress_customerId_idx" ON "CustomerDispatchAddress"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_customerId_tagId_key" ON "CustomerTag"("customerId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCodeMaster_code_key" ON "MaterialCodeMaster"("code");

-- CreateIndex
CREATE INDEX "CustomerMaster_companyType_idx" ON "CustomerMaster"("companyType");

-- CreateIndex
CREATE INDEX "PipeSizeMaster_nps_idx" ON "PipeSizeMaster"("nps");

-- CreateIndex
CREATE INDEX "PipeSizeMaster_nps_schedule_idx" ON "PipeSizeMaster"("nps", "schedule");

-- CreateIndex
CREATE INDEX "Quotation_buyerId_idx" ON "Quotation"("buyerId");

-- CreateIndex
CREATE INDEX "Quotation_quotationCategory_idx" ON "Quotation"("quotationCategory");

-- CreateIndex
CREATE INDEX "QuotationItem_materialCodeId_idx" ON "QuotationItem"("materialCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMaster_linkedCustomerId_key" ON "VendorMaster"("linkedCustomerId");

-- AddForeignKey
ALTER TABLE "CustomerMaster" ADD CONSTRAINT "CustomerMaster_defaultPaymentTermsId_fkey" FOREIGN KEY ("defaultPaymentTermsId") REFERENCES "PaymentTermsMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMaster" ADD CONSTRAINT "VendorMaster_linkedCustomerId_fkey" FOREIGN KEY ("linkedCustomerId") REFERENCES "CustomerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_preparedByEmployeeId_fkey" FOREIGN KEY ("preparedByEmployeeId") REFERENCES "EmployeeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_materialCodeId_fkey" FOREIGN KEY ("materialCodeId") REFERENCES "MaterialCodeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMaster" ADD CONSTRAINT "EmployeeMaster_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerMaster" ADD CONSTRAINT "BuyerMaster_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDispatchAddress" ADD CONSTRAINT "CustomerDispatchAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
