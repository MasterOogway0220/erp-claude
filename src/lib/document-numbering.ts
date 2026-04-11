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
  | "LAB_LETTER"
  | "RFQ"
  | "COMPARATIVE_STATEMENT"
  | "MTC_CERTIFICATE"
  | "TENDER";

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
  RFQ: "RFQ",
  COMPARATIVE_STATEMENT: "CS",
  MTC_CERTIFICATE: "MTC",
  TENDER: "TND",
};

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Indian FY: April to March
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return `${fyStartYear}-${(fyEndYear % 100).toString().padStart(2, "0")}`;
}

export async function generateDocumentNumber(
  documentType: DocumentType,
  companyId?: string | null
): Promise<string> {
  const currentFY = getCurrentFinancialYear();
  const prefix = PREFIXES[documentType];

  // Find sequence for this company+documentType
  let sequence = await prisma.documentSequence.findFirst({
    where: { documentType, companyId: companyId || undefined },
  });

  if (!sequence) {
    // Try legacy sequence without companyId
    sequence = await prisma.documentSequence.findFirst({
      where: { documentType, companyId: null },
    });
  }

  if (!sequence) {
    // Auto-create sequence
    sequence = await prisma.documentSequence.create({
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
    await prisma.documentSequence.update({
      where: { id: sequence.id },
      data: {
        currentNumber: 1,
        financialYear: currentFY,
      },
    });
  } else {
    nextNumber = sequence.currentNumber + 1;
    await prisma.documentSequence.update({
      where: { id: sequence.id },
      data: { currentNumber: nextNumber },
    });
  }

  return `${prefix}/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;
}
