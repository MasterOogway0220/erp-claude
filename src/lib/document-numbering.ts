import { prisma } from "./prisma";

export type DocumentType =
  | "ENQUIRY"
  | "QUOTATION"
  | "SALES_ORDER"
  | "PURCHASE_REQUISITION"
  | "PURCHASE_ORDER"
  | "GRN"
  | "INSPECTION"
  | "NCR"
  | "QC_RELEASE"
  | "PACKING_LIST"
  | "DISPATCH_NOTE"
  | "INVOICE_DOMESTIC"
  | "INVOICE_EXPORT"
  | "RECEIPT"
  | "STOCK_ISSUE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

const PREFIXES: Record<DocumentType, string> = {
  ENQUIRY: "ENQ",
  QUOTATION: "NPS",
  SALES_ORDER: "SO",
  PURCHASE_REQUISITION: "PR",
  PURCHASE_ORDER: "PO",
  GRN: "GRN",
  INSPECTION: "INS",
  NCR: "NCR",
  QC_RELEASE: "QCR",
  PACKING_LIST: "PL",
  DISPATCH_NOTE: "DN",
  INVOICE_DOMESTIC: "INV",
  INVOICE_EXPORT: "EXP",
  RECEIPT: "REC",
  STOCK_ISSUE: "ISS",
  CREDIT_NOTE: "CN",
  DEBIT_NOTE: "DBN",
};

function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Indian FY: April to March
  // If month >= 4 (April), FY starts this year; otherwise last year
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  // Format: YYYY-YY (e.g., 2025-26)
  return `${fyStartYear}-${(fyEndYear % 100).toString().padStart(2, "0")}`;
}

export async function generateDocumentNumber(
  documentType: DocumentType
): Promise<string> {
  const currentFY = getCurrentFinancialYear();
  const prefix = PREFIXES[documentType];

  return await prisma.$transaction(async (tx) => {
    const sequence = await tx.documentSequence.findUnique({
      where: { documentType },
    });

    if (!sequence) {
      throw new Error(`Document sequence not found for type: ${documentType}`);
    }

    let nextNumber: number;

    if (sequence.financialYear !== currentFY) {
      // Financial year changed, reset counter
      nextNumber = 1;
      await tx.documentSequence.update({
        where: { documentType },
        data: {
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    } else {
      nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { documentType },
        data: { currentNumber: nextNumber },
      });
    }

    return `${prefix}/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;
  });
}
