-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES', 'PURCHASE', 'QC', 'STORES', 'ACCOUNTS', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('UNDER_INSPECTION', 'ACCEPTED', 'REJECTED', 'HOLD', 'RESERVED', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "QuotationType" AS ENUM ('DOMESTIC', 'EXPORT', 'BOM');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REVISED', 'SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "SOStatus" AS ENUM ('OPEN', 'PARTIALLY_DISPATCHED', 'FULLY_DISPATCHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PO_CREATED');

-- CreateEnum
CREATE TYPE "NCRStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "NCRDisposition" AS ENUM ('RETURN_TO_VENDOR', 'REWORK', 'SCRAP', 'USE_AS_IS');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'FAIL', 'HOLD');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('RTGS', 'NEFT', 'CHEQUE', 'LC', 'TT', 'CASH');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('DOMESTIC', 'EXPORT', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'QUOTATION_PREPARED', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnquiryMode" AS ENUM ('EMAIL', 'PHONE', 'WALK_IN');

-- CreateEnum
CREATE TYPE "POAcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'HOLD');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "PipeType" AS ENUM ('CS_AS', 'SS_DS');

-- CreateEnum
CREATE TYPE "EndType" AS ENUM ('BE', 'PE', 'NPTM', 'BSPT');

-- CreateEnum
CREATE TYPE "MTCType" AS ENUM ('MTC_3_1', 'MTC_3_2');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'RELEASED', 'DISPATCHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SALES',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "ipAddress" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT,
    "gstNo" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "paymentTerms" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "approvedStatus" BOOLEAN NOT NULL DEFAULT true,
    "productsSupplied" TEXT,
    "avgLeadTimeDays" INTEGER,
    "performanceScore" DECIMAL(3,1),
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecMaster" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "material" TEXT,
    "additionalSpec" TEXT,
    "ends" TEXT,
    "length" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSpecMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipeSizeMaster" (
    "id" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "od" DECIMAL(10,3) NOT NULL,
    "wt" DECIMAL(10,3) NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL,
    "pipeType" "PipeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipeSizeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestingMaster" (
    "id" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "applicableFor" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestingMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "taxType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchangeRate" DECIMAL(10,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UomMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UomMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTermsMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTermsMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTermsMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTermsMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionAgencyMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionAgencyMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationTypeMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationTypeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimensionalStandardMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DimensionalStandardMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransporterMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "vehicleTypes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransporterMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "enquiryNo" TEXT NOT NULL,
    "enquiryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "buyerName" TEXT,
    "buyerDesignation" TEXT,
    "buyerEmail" TEXT,
    "buyerContact" TEXT,
    "clientInquiryNo" TEXT,
    "clientInquiryDate" TIMESTAMP(3),
    "enquiryMode" "EnquiryMode" NOT NULL DEFAULT 'EMAIL',
    "projectName" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryItem" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "additionalSpec" TEXT,
    "size" TEXT,
    "ends" TEXT,
    "quantity" DECIMAL(10,3),
    "uom" TEXT,
    "remarks" TEXT,

    CONSTRAINT "EnquiryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNo" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enquiryId" TEXT,
    "customerId" TEXT NOT NULL,
    "quotationType" "QuotationType" NOT NULL DEFAULT 'DOMESTIC',
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentQuotationId" TEXT,
    "validUpto" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "preparedById" TEXT,
    "approvedById" TEXT,
    "approvalDate" TIMESTAMP(3),
    "approvalRemarks" TEXT,
    "sentDate" TIMESTAMP(3),
    "sentTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "additionalSpec" TEXT,
    "sizeId" TEXT,
    "sizeLabel" TEXT,
    "od" DECIMAL(10,3),
    "wt" DECIMAL(10,3),
    "length" TEXT,
    "ends" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "delivery" TEXT,
    "remark" TEXT,
    "unitWeight" DECIMAL(10,4),
    "totalWeightMT" DECIMAL(12,4),
    "tagNo" TEXT,
    "drawingRef" TEXT,
    "itemType" TEXT,
    "wtType" TEXT,
    "tubeLength" TEXT,
    "tubeCount" INTEGER,
    "componentPosition" TEXT,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTerm" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "termNo" INTEGER NOT NULL,
    "termName" TEXT NOT NULL,
    "termValue" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuotationTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "soNo" TEXT NOT NULL,
    "soDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "quotationId" TEXT,
    "customerPoNo" TEXT,
    "customerPoDate" TIMESTAMP(3),
    "customerPoDocument" TEXT,
    "poAcceptanceStatus" "POAcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "status" "SOStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "additionalSpec" TEXT,
    "sizeLabel" TEXT,
    "od" DECIMAL(10,3),
    "wt" DECIMAL(10,3),
    "ends" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "unitWeight" DECIMAL(10,4),
    "totalWeightMT" DECIMAL(12,4),

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "salesOrderItemId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "reservedQtyMtr" DECIMAL(10,3) NOT NULL,
    "reservedPieces" INTEGER NOT NULL DEFAULT 0,
    "reservedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "prNo" TEXT NOT NULL,
    "prDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesOrderId" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "suggestedVendorId" TEXT,
    "status" "PRStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PRItem" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "additionalSpec" TEXT,
    "sizeLabel" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "uom" TEXT,
    "remarks" TEXT,

    CONSTRAINT "PRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorId" TEXT NOT NULL,
    "prId" TEXT,
    "salesOrderId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentPoId" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "specialRequirements" TEXT,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "additionalSpec" TEXT,
    "sizeLabel" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "deliveryDate" TIMESTAMP(3),

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptNote" (
    "id" TEXT NOT NULL,
    "grnNo" TEXT NOT NULL,
    "grnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRNItem" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "product" TEXT,
    "material" TEXT,
    "specification" TEXT,
    "additionalSpec" TEXT,
    "dimensionStd" TEXT,
    "sizeLabel" TEXT,
    "ends" TEXT,
    "length" TEXT,
    "heatNo" TEXT,
    "make" TEXT,
    "receivedQtyMtr" DECIMAL(10,3) NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 0,
    "mtcNo" TEXT,
    "mtcDate" TIMESTAMP(3),
    "mtcType" TEXT,
    "tpiAgency" TEXT,
    "mtcDocumentPath" TEXT,
    "tpiCertificatePath" TEXT,

    CONSTRAINT "GRNItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStock" (
    "id" TEXT NOT NULL,
    "form" TEXT,
    "product" TEXT,
    "specification" TEXT,
    "additionalSpec" TEXT,
    "dimensionStd" TEXT,
    "sizeLabel" TEXT,
    "od" DECIMAL(10,3),
    "wt" DECIMAL(10,3),
    "ends" TEXT,
    "length" TEXT,
    "heatNo" TEXT,
    "make" TEXT,
    "quantityMtr" DECIMAL(10,3) NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 0,
    "mtcNo" TEXT,
    "mtcDate" TIMESTAMP(3),
    "mtcType" "MTCType",
    "tpiAgency" TEXT,
    "location" TEXT,
    "rackNo" TEXT,
    "notes" TEXT,
    "status" "StockStatus" NOT NULL DEFAULT 'UNDER_INSPECTION',
    "grnItemId" TEXT,
    "reservedForSO" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectionNo" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grnItemId" TEXT,
    "inventoryStockId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "overallResult" "InspectionResult" NOT NULL DEFAULT 'HOLD',
    "remarks" TEXT,
    "reportPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionParameter" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterType" TEXT NOT NULL DEFAULT 'PASS_FAIL',
    "resultValue" TEXT,
    "standardValue" TEXT,
    "tolerance" TEXT,
    "result" TEXT,
    "remarks" TEXT,

    CONSTRAINT "InspectionParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MTCDocument" (
    "id" TEXT NOT NULL,
    "mtcNo" TEXT NOT NULL,
    "heatNo" TEXT,
    "filePath" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poId" TEXT,
    "grnId" TEXT,
    "inventoryStockId" TEXT,
    "remarks" TEXT,

    CONSTRAINT "MTCDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NCR" (
    "id" TEXT NOT NULL,
    "ncrNo" TEXT NOT NULL,
    "ncrDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grnItemId" TEXT,
    "inventoryStockId" TEXT,
    "heatNo" TEXT,
    "poId" TEXT,
    "vendorId" TEXT,
    "nonConformanceType" TEXT,
    "description" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "disposition" "NCRDisposition",
    "status" "NCRStatus" NOT NULL DEFAULT 'OPEN',
    "closedDate" TIMESTAMP(3),
    "closedById" TEXT,
    "evidencePaths" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NCR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabLetter" (
    "id" TEXT NOT NULL,
    "letterNo" TEXT NOT NULL,
    "letterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heatNo" TEXT,
    "specification" TEXT,
    "sizeLabel" TEXT,
    "testIds" JSONB,
    "generatedPath" TEXT,
    "generatedById" TEXT,

    CONSTRAINT "LabLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingList" (
    "id" TEXT NOT NULL,
    "plNo" TEXT NOT NULL,
    "plDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesOrderId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingListItem" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "heatNo" TEXT,
    "sizeLabel" TEXT,
    "material" TEXT,
    "quantityMtr" DECIMAL(10,3) NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 0,
    "bundleNo" TEXT,
    "grossWeightKg" DECIMAL(10,3),
    "netWeightKg" DECIMAL(10,3),
    "markingDetails" TEXT,

    CONSTRAINT "PackingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchNote" (
    "id" TEXT NOT NULL,
    "dnNo" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packingListId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "lrNo" TEXT,
    "transporterId" TEXT,
    "destination" TEXT,
    "ewayBillNo" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'DOMESTIC',
    "dispatchNoteId" TEXT,
    "salesOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sNo" INTEGER NOT NULL,
    "description" TEXT,
    "heatNo" TEXT,
    "sizeLabel" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "hsnCode" TEXT,
    "taxRate" DECIMAL(5,2),

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountReceived" DECIMAL(14,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'NEFT',
    "referenceNo" TEXT,
    "bankName" TEXT,
    "tdsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "financialYear" TEXT NOT NULL,
    "resetMonth" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "PipeSizeMaster_pipeType_idx" ON "PipeSizeMaster"("pipeType");

-- CreateIndex
CREATE INDEX "PipeSizeMaster_sizeLabel_idx" ON "PipeSizeMaster"("sizeLabel");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyMaster_code_key" ON "CurrencyMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UomMaster_code_key" ON "UomMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionAgencyMaster_code_key" ON "InspectionAgencyMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationTypeMaster_code_key" ON "CertificationTypeMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DimensionalStandardMaster_code_key" ON "DimensionalStandardMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_enquiryNo_key" ON "Enquiry"("enquiryNo");

-- CreateIndex
CREATE INDEX "Enquiry_enquiryNo_idx" ON "Enquiry"("enquiryNo");

-- CreateIndex
CREATE INDEX "Enquiry_customerId_idx" ON "Enquiry"("customerId");

-- CreateIndex
CREATE INDEX "EnquiryItem_enquiryId_idx" ON "EnquiryItem"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNo_key" ON "Quotation"("quotationNo");

-- CreateIndex
CREATE INDEX "Quotation_quotationNo_idx" ON "Quotation"("quotationNo");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_enquiryId_idx" ON "Quotation"("enquiryId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationTerm_quotationId_idx" ON "QuotationTerm"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNo_key" ON "SalesOrder"("soNo");

-- CreateIndex
CREATE INDEX "SalesOrder_soNo_idx" ON "SalesOrder"("soNo");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE INDEX "StockReservation_salesOrderItemId_idx" ON "StockReservation"("salesOrderItemId");

-- CreateIndex
CREATE INDEX "StockReservation_inventoryStockId_idx" ON "StockReservation"("inventoryStockId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequisition_prNo_key" ON "PurchaseRequisition"("prNo");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_prNo_idx" ON "PurchaseRequisition"("prNo");

-- CreateIndex
CREATE INDEX "PRItem_prId_idx" ON "PRItem"("prId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNo_key" ON "PurchaseOrder"("poNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNo_idx" ON "PurchaseOrder"("poNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "POItem_poId_idx" ON "POItem"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptNote_grnNo_key" ON "GoodsReceiptNote"("grnNo");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_grnNo_idx" ON "GoodsReceiptNote"("grnNo");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_poId_idx" ON "GoodsReceiptNote"("poId");

-- CreateIndex
CREATE INDEX "GRNItem_grnId_idx" ON "GRNItem"("grnId");

-- CreateIndex
CREATE INDEX "GRNItem_heatNo_idx" ON "GRNItem"("heatNo");

-- CreateIndex
CREATE INDEX "InventoryStock_heatNo_idx" ON "InventoryStock"("heatNo");

-- CreateIndex
CREATE INDEX "InventoryStock_status_idx" ON "InventoryStock"("status");

-- CreateIndex
CREATE INDEX "InventoryStock_sizeLabel_idx" ON "InventoryStock"("sizeLabel");

-- CreateIndex
CREATE INDEX "InventoryStock_grnItemId_idx" ON "InventoryStock"("grnItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_inspectionNo_key" ON "Inspection"("inspectionNo");

-- CreateIndex
CREATE INDEX "Inspection_inspectionNo_idx" ON "Inspection"("inspectionNo");

-- CreateIndex
CREATE INDEX "Inspection_grnItemId_idx" ON "Inspection"("grnItemId");

-- CreateIndex
CREATE INDEX "Inspection_inventoryStockId_idx" ON "Inspection"("inventoryStockId");

-- CreateIndex
CREATE INDEX "InspectionParameter_inspectionId_idx" ON "InspectionParameter"("inspectionId");

-- CreateIndex
CREATE INDEX "MTCDocument_heatNo_idx" ON "MTCDocument"("heatNo");

-- CreateIndex
CREATE INDEX "MTCDocument_mtcNo_idx" ON "MTCDocument"("mtcNo");

-- CreateIndex
CREATE UNIQUE INDEX "NCR_ncrNo_key" ON "NCR"("ncrNo");

-- CreateIndex
CREATE INDEX "NCR_ncrNo_idx" ON "NCR"("ncrNo");

-- CreateIndex
CREATE INDEX "NCR_heatNo_idx" ON "NCR"("heatNo");

-- CreateIndex
CREATE INDEX "LabLetter_heatNo_idx" ON "LabLetter"("heatNo");

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_plNo_key" ON "PackingList"("plNo");

-- CreateIndex
CREATE INDEX "PackingList_plNo_idx" ON "PackingList"("plNo");

-- CreateIndex
CREATE INDEX "PackingListItem_packingListId_idx" ON "PackingListItem"("packingListId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchNote_dnNo_key" ON "DispatchNote"("dnNo");

-- CreateIndex
CREATE INDEX "DispatchNote_dnNo_idx" ON "DispatchNote"("dnNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNo_idx" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptNo_key" ON "PaymentReceipt"("receiptNo");

-- CreateIndex
CREATE INDEX "PaymentReceipt_receiptNo_idx" ON "PaymentReceipt"("receiptNo");

-- CreateIndex
CREATE INDEX "PaymentReceipt_invoiceId_idx" ON "PaymentReceipt"("invoiceId");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_recordId_idx" ON "AuditLog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSequence_documentType_key" ON "DocumentSequence"("documentType");

-- CreateIndex
CREATE INDEX "DocumentSequence_documentType_idx" ON "DocumentSequence"("documentType");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryItem" ADD CONSTRAINT "EnquiryItem_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_parentQuotationId_fkey" FOREIGN KEY ("parentQuotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PipeSizeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationTerm" ADD CONSTRAINT "QuotationTerm_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_suggestedVendorId_fkey" FOREIGN KEY ("suggestedVendorId") REFERENCES "VendorMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRItem" ADD CONSTRAINT "PRItem_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_parentPoId_fkey" FOREIGN KEY ("parentPoId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNItem" ADD CONSTRAINT "GRNItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "GRNItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "GRNItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionParameter" ADD CONSTRAINT "InspectionParameter_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MTCDocument" ADD CONSTRAINT "MTCDocument_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MTCDocument" ADD CONSTRAINT "MTCDocument_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MTCDocument" ADD CONSTRAINT "MTCDocument_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCR" ADD CONSTRAINT "NCR_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "GRNItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCR" ADD CONSTRAINT "NCR_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCR" ADD CONSTRAINT "NCR_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCR" ADD CONSTRAINT "NCR_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCR" ADD CONSTRAINT "NCR_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabLetter" ADD CONSTRAINT "LabLetter_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "InventoryStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchNote" ADD CONSTRAINT "DispatchNote_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchNote" ADD CONSTRAINT "DispatchNote_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchNote" ADD CONSTRAINT "DispatchNote_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "TransporterMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "DispatchNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
