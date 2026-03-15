import { prisma } from "./prisma";

export type DocumentType =
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
  | "DEBIT_NOTE"
  | "CLIENT_PO"
  | "PO_ACCEPTANCE"
  | "WAREHOUSE_INTIMATION"
  | "INSPECTION_OFFER"
  | "LAB_REPORT"
  | "LAB_LETTER";

export const PREFIXES: Record<DocumentType, string> = {
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
  CLIENT_PO: "CPO",
  PO_ACCEPTANCE: "POA",
  WAREHOUSE_INTIMATION: "MPR",
  INSPECTION_OFFER: "IOF",
  LAB_REPORT: "LR",
  LAB_LETTER: "LAB",
};

export function getCurrentFinancialYear(): string {
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
  documentType: DocumentType,
  companyId?: string | null
): Promise<string> {
  const currentFY = getCurrentFinancialYear();
  const prefix = PREFIXES[documentType];

  return await prisma.$transaction(async (tx) => {
    // Find sequence for this company+documentType combination
    let sequence = await tx.documentSequence.findFirst({
      where: {
        documentType,
        companyId: companyId || null,
      },
    });

    if (!sequence) {
      // Try legacy sequence without companyId
      sequence = await tx.documentSequence.findFirst({
        where: { documentType, companyId: null },
      });
    }

    if (!sequence) {
      // Auto-create sequence for this company
      sequence = await tx.documentSequence.create({
        data: {
          documentType,
          prefix,
          currentNumber: 0,
          financialYear: currentFY,
          companyId: companyId || null,
        },
      });
    }

    let nextNumber: number;

    if (sequence.financialYear !== currentFY) {
      // Financial year changed, reset counter
      nextNumber = 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: {
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    } else {
      nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });
    }

    return `${prefix}/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;
  });
}
