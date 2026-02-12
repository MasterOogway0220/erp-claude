/**
 * E-Invoice JSON Generator for GST Portal
 * Generates GST-compliant e-invoice JSON format for submission to Government portal
 *
 * Reference: https://einvoice1.gst.gov.in/
 * Schema Version: 1.1
 */

import { prisma } from '@/lib/prisma';

export interface EInvoiceJSON {
  Version: string;
  TranDtls: TransactionDetails;
  DocDtls: DocumentDetails;
  SellerDtls: SellerDetails;
  BuyerDtls: BuyerDetails;
  DispDtls?: DispatchDetails;
  ShipDtls?: ShippingDetails;
  ItemList: InvoiceItem[];
  ValDtls: ValueDetails;
  RefDtls?: ReferenceDetails;
}

interface TransactionDetails {
  TaxSch: string; // "GST"
  SupTyp: string; // "B2B" | "SEZWP" | "SEZWOP" | "EXPWP" | "EXPWOP" | "DEXP"
  RegRev?: string; // "Y" | "N" - Reverse Charge
  EcmGstin?: string; // E-commerce GSTIN
  IgstOnIntra?: string; // "Y" | "N" - IGST on intra-state
}

interface DocumentDetails {
  Typ: string; // "INV" | "CRN" | "DBN"
  No: string; // Invoice number
  Dt: string; // Invoice date (DD/MM/YYYY)
}

interface SellerDetails {
  Gstin: string;
  LglNm: string; // Legal name
  TrdNm?: string; // Trade name
  Addr1: string;
  Addr2?: string;
  Loc: string; // Location
  Pin: number;
  Stcd: string; // State code (2 digits)
  Ph?: string;
  Em?: string;
}

interface BuyerDetails {
  Gstin?: string; // Optional for B2C
  LglNm: string;
  TrdNm?: string;
  Pos: string; // Place of supply (state code)
  Addr1: string;
  Addr2?: string;
  Loc: string;
  Pin: number;
  Stcd: string; // State code
  Ph?: string;
  Em?: string;
}

interface DispatchDetails {
  Nm: string;
  Addr1: string;
  Addr2?: string;
  Loc: string;
  Pin: number;
  Stcd: string;
}

interface ShippingDetails {
  Gstin?: string;
  LglNm: string;
  TrdNm?: string;
  Addr1: string;
  Addr2?: string;
  Loc: string;
  Pin: number;
  Stcd: string;
}

interface InvoiceItem {
  SlNo: string; // Serial number
  PrdDesc: string; // Product description
  IsServc: string; // "Y" | "N" - Is it a service?
  HsnCd: string; // HSN code
  Barcde?: string; // Barcode
  Qty?: number;
  FreeQty?: number;
  Unit: string; // "MTR" | "KGS" | "NOS" | "PCS"
  UnitPrice: number;
  TotAmt: number; // Total amount (before discount)
  Discount?: number;
  PreTaxVal?: number; // Pre-tax value
  AssAmt: number; // Assessable amount (taxable value)
  GstRt: number; // GST rate (percentage)
  IgstAmt?: number;
  CgstAmt?: number;
  SgstAmt?: number;
  CesRt?: number; // Cess rate
  CesAmt?: number; // Cess amount
  CesNonAdvlAmt?: number; // Cess non-ad valorem
  StateCesRt?: number;
  StateCesAmt?: number;
  StateCesNonAdvlAmt?: number;
  OthChrg?: number; // Other charges
  TotItemVal: number; // Total item value (including tax)
}

interface ValueDetails {
  AssVal: number; // Total assessable value
  CgstVal?: number; // Total CGST
  SgstVal?: number; // Total SGST
  IgstVal?: number; // Total IGST
  CesVal?: number; // Total cess
  StCesVal?: number; // Total state cess
  Discount?: number; // Total discount
  OthChrg?: number; // Other charges
  RndOffAmt?: number; // Round off amount
  TotInvVal: number; // Total invoice value (final amount)
  TotInvValFc?: number; // Total in foreign currency
}

interface ReferenceDetails {
  InvRm?: string; // Invoice remarks
  DocPerdDtls?: {
    InvStDt: string; // Start date
    InvEndDt: string; // End date
  };
  PrecDocDtls?: Array<{
    InvNo: string;
    InvDt: string;
    OthRefNo?: string;
  }>;
  ContrDtls?: Array<{
    RecAdvRefr?: string;
    RecAdvDt?: string;
    TendRefr?: string;
    ContrRefr?: string;
    ExtRefr?: string;
    ProjRefr?: string;
    PORefr?: string;
    PORefDt?: string;
  }>;
}

/**
 * Generate E-Invoice JSON for an invoice
 */
export async function generateEInvoiceJSON(
  invoiceId: string
): Promise<EInvoiceJSON> {
  // Fetch invoice with all related data
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      salesOrder: {
        include: {
          quotation: true,
        },
      },
      dispatchNote: {
        include: {
          packingList: true,
        },
      },
      items: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (!invoice.customer.gstNo) {
    throw new Error('Customer GST number is required for e-invoice generation');
  }

  // Determine supply type
  const supplyType = determineSupplyType(invoice);

  // Determine if IGST (inter-state) or CGST+SGST (intra-state)
  const sellerStateCode = '27'; // Maharashtra (hardcoded - should come from company config)
  const buyerStateCode = extractStateCode(invoice.customer.gstNo);
  const isInterState = sellerStateCode !== buyerStateCode;

  // Build e-invoice JSON
  const eInvoice: EInvoiceJSON = {
    Version: '1.1',

    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supplyType,
      RegRev: 'N', // Reverse charge: No (default)
      IgstOnIntra: isInterState ? undefined : 'N',
    },

    DocDtls: {
      Typ: 'INV',
      No: invoice.invoiceNo,
      Dt: formatDate(invoice.invoiceDate),
    },

    SellerDtls: {
      Gstin: '27ABCDE1234F1Z5', // Company GSTIN (from config)
      LglNm: 'National Pipe & Supply',
      TrdNm: 'NPS',
      Addr1: 'Plot No. 123, Industrial Area',
      Addr2: 'Solapur',
      Loc: 'Solapur',
      Pin: 413006,
      Stcd: '27', // Maharashtra
      Ph: '02172345678',
      Em: 'sales@nps.com',
    },

    BuyerDtls: {
      Gstin: invoice.customer.gstNo || undefined,
      LglNm: invoice.customer.name,
      Pos: buyerStateCode,
      Addr1: invoice.customer.addressLine1 || '',
      Loc: invoice.customer.city || '',
      Pin: parseInt(invoice.customer.pincode || '000000'),
      Stcd: buyerStateCode,
      Ph: invoice.customer.phone || undefined,
      Em: invoice.customer.email || undefined,
    },

    ItemList: invoice.items.map((item, index) => {
      const gstRate = 18; // 18% GST for steel pipes (standard rate)
      const assessableAmount = Number(item.amount);
      const quantity = Number(item.quantity);
      const unitRate = Number(item.unitRate);

      let igstAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;

      if (isInterState) {
        // IGST for inter-state
        igstAmount = (assessableAmount * gstRate) / 100;
      } else {
        // CGST + SGST for intra-state
        cgstAmount = (assessableAmount * (gstRate / 2)) / 100;
        sgstAmount = (assessableAmount * (gstRate / 2)) / 100;
      }

      const totalItemValue = assessableAmount + igstAmount + cgstAmount + sgstAmount;

      return {
        SlNo: (index + 1).toString(),
        PrdDesc: item.description || item.sizeLabel || '',
        IsServc: 'N', // Goods, not service
        HsnCd: item.hsnCode || '7304', // HSN code for seamless pipes
        Qty: quantity,
        Unit: 'MTR', // Default unit
        UnitPrice: unitRate,
        TotAmt: assessableAmount,
        AssAmt: assessableAmount,
        GstRt: gstRate,
        IgstAmt: isInterState ? igstAmount : undefined,
        CgstAmt: !isInterState ? cgstAmount : undefined,
        SgstAmt: !isInterState ? sgstAmount : undefined,
        TotItemVal: totalItemValue,
      };
    }),

    ValDtls: calculateValueDetails(invoice, isInterState),

    RefDtls: {
      ContrDtls: invoice.salesOrder
        ? [
            {
              PORefr: invoice.salesOrder.customerPoNo || undefined,
              PORefDt: invoice.salesOrder.customerPoDate
                ? formatDate(invoice.salesOrder.customerPoDate)
                : undefined,
            },
          ]
        : undefined,
    },
  };

  return eInvoice;
}

/**
 * Determine supply type based on invoice
 */
function determineSupplyType(invoice: any): string {
  // Check if export
  if (invoice.salesOrder?.quotation?.quotationType === 'EXPORT') {
    return 'EXPWOP'; // Export without payment of tax
  }

  // Check if SEZ
  // (Add logic if you have SEZ customers)

  // Default: B2B
  return 'B2B';
}

/**
 * Extract state code from GSTIN (first 2 digits)
 */
function extractStateCode(gstin: string): string {
  if (!gstin || gstin.length < 2) {
    throw new Error('Invalid GSTIN format');
  }
  return gstin.substring(0, 2);
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calculate value details (totals)
 */
function calculateValueDetails(invoice: any, isInterState: boolean): ValueDetails {
  const gstRate = 18;
  const assessableValue = invoice.items.reduce(
    (sum: number, item: any) => sum + item.amount,
    0
  );

  let cgstVal = 0;
  let sgstVal = 0;
  let igstVal = 0;

  if (isInterState) {
    igstVal = (assessableValue * gstRate) / 100;
  } else {
    cgstVal = (assessableValue * (gstRate / 2)) / 100;
    sgstVal = (assessableValue * (gstRate / 2)) / 100;
  }

  const totalInvoiceValue = assessableValue + cgstVal + sgstVal + igstVal;

  return {
    AssVal: Number(assessableValue.toFixed(2)),
    CgstVal: !isInterState ? Number(cgstVal.toFixed(2)) : undefined,
    SgstVal: !isInterState ? Number(sgstVal.toFixed(2)) : undefined,
    IgstVal: isInterState ? Number(igstVal.toFixed(2)) : undefined,
    TotInvVal: Number(totalInvoiceValue.toFixed(2)),
  };
}

/**
 * Validate e-invoice JSON before submission
 */
export function validateEInvoiceJSON(eInvoice: EInvoiceJSON): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate seller GSTIN
  if (!eInvoice.SellerDtls.Gstin || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(eInvoice.SellerDtls.Gstin)) {
    errors.push('Invalid seller GSTIN format');
  }

  // Validate buyer GSTIN (if B2B)
  if (eInvoice.TranDtls.SupTyp === 'B2B' && eInvoice.BuyerDtls.Gstin) {
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(eInvoice.BuyerDtls.Gstin)) {
      errors.push('Invalid buyer GSTIN format');
    }
  }

  // Validate invoice number
  if (!eInvoice.DocDtls.No || eInvoice.DocDtls.No.length > 16) {
    errors.push('Invoice number is required and must be max 16 characters');
  }

  // Validate total values match
  const itemsTotal = eInvoice.ItemList.reduce((sum, item) => sum + item.TotItemVal, 0);
  const diff = Math.abs(itemsTotal - eInvoice.ValDtls.TotInvVal);
  if (diff > 1) {
    // Allow 1 rupee difference for rounding
    errors.push(`Total value mismatch: Items total ${itemsTotal.toFixed(2)} vs Invoice total ${eInvoice.ValDtls.TotInvVal.toFixed(2)}`);
  }

  // Validate at least one item
  if (eInvoice.ItemList.length === 0) {
    errors.push('Invoice must have at least one item');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Save e-invoice JSON to file for submission to GST portal
 */
export async function saveEInvoiceJSON(
  invoiceId: string,
  eInvoice: EInvoiceJSON
): Promise<string> {
  const fs = require('fs').promises;
  const path = require('path');

  const fileName = `${eInvoice.DocDtls.No.replace(/\//g, '-')}_einvoice.json`;
  const filePath = path.join(process.cwd(), 'public', 'invoices', 'e-invoice', fileName);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // Write JSON file
  await fs.writeFile(filePath, JSON.stringify(eInvoice, null, 2), 'utf8');

  // Update invoice record with e-invoice file path
  // Note: Add these fields to Invoice model if needed:
  // eInvoiceJSON String?, eInvoiceStatus String?, eInvoiceGeneratedAt DateTime?
  // await prisma.invoice.update({
  //   where: { id: invoiceId },
  //   data: {
  //     eInvoiceJSON: `/invoices/e-invoice/${fileName}`,
  //     eInvoiceStatus: 'GENERATED',
  //     eInvoiceGeneratedAt: new Date(),
  //   },
  // });

  return filePath;
}

/**
 * Generate IRN (Invoice Reference Number) after successful GST portal submission
 * Note: Actual IRN is generated by GST portal, this is a placeholder
 */
export async function updateInvoiceWithIRN(
  invoiceId: string,
  irn: string,
  ackNo: string,
  ackDate: Date
) {
  // Note: Add these fields to Invoice model if needed:
  // irn String?, ackNo String?, ackDate DateTime?, eInvoiceStatus String?
  // await prisma.invoice.update({
  //   where: { id: invoiceId },
  //   data: {
  //     irn,
  //     ackNo,
  //     ackDate,
  //     eInvoiceStatus: 'SUBMITTED',
  //   },
  // });
  console.log(`Invoice ${invoiceId} IRN: ${irn}, Ack: ${ackNo}`);
}
