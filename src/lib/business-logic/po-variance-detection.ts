/**
 * PO vs Quotation Variance Detection
 * PRD Business Logic Requirement
 *
 * Detects and reports variances between Purchase Order and original Quotation
 * to ensure pricing integrity and prevent unauthorized changes
 */

import { prisma } from '@/lib/prisma';

export interface VarianceItem {
  lineNo: number;
  field: string;
  quotationValue: any;
  poValue: any;
  variance: number | string;
  variancePercent?: number;
}

export interface VarianceReport {
  hasVariances: boolean;
  totalVarianceAmount?: number;
  totalVariancePercent?: number;
  items: VarianceItem[];
  warnings: string[];
  requiresApproval: boolean;
}

/**
 * Compare PO against Quotation and detect variances
 */
export async function detectPOVariances(
  quotationId: string,
  poItems: any[],
  poTotalAmount: number
): Promise<VarianceReport> {
  const variances: VarianceItem[] = [];
  const warnings: string[] = [];

  // Fetch quotation with items
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: {
        orderBy: { sNo: 'asc' },
      },
    },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Check if quotation is approved
  if (quotation.status !== 'APPROVED') {
    warnings.push(
      'Warning: Quotation is not in APPROVED status. ' +
      'Creating PO from unapproved quotation may cause compliance issues.'
    );
  }

  // Calculate quotation total
  const quotationTotal = quotation.items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  // Check total amount variance
  const totalVariance = poTotalAmount - quotationTotal;
  const totalVariancePercent = (totalVariance / quotationTotal) * 100;

  if (Math.abs(totalVariancePercent) > 0.1) {
    // More than 0.1% variance
    variances.push({
      lineNo: 0, // Summary line
      field: 'Total Amount',
      quotationValue: quotationTotal,
      poValue: poTotalAmount,
      variance: totalVariance,
      variancePercent: totalVariancePercent,
    });
  }

  // Compare line items
  for (let i = 0; i < poItems.length; i++) {
    const poItem = poItems[i];
    const quotationItem = quotation.items[i];

    if (!quotationItem) {
      warnings.push(
        `PO has more items (${poItems.length}) than quotation (${quotation.items.length}). ` +
        'Extra items detected starting at line ' + (i + 1)
      );
      break;
    }

    // Check quantity variance
    const quotationQty = Number(quotationItem.quantity);
    if (poItem.quantity !== quotationQty) {
      const qtyVariance = poItem.quantity - quotationQty;
      const qtyVariancePercent = (qtyVariance / quotationQty) * 100;

      variances.push({
        lineNo: i + 1,
        field: 'Quantity',
        quotationValue: quotationItem.quantity,
        poValue: poItem.quantity,
        variance: qtyVariance,
        variancePercent: qtyVariancePercent,
      });
    }

    // Check unit rate variance
    const quotationRate = Number(quotationItem.unitRate);
    if (Math.abs(poItem.unitRate - quotationRate) > 0.01) {
      const rateVariance = poItem.unitRate - quotationRate;
      const rateVariancePercent = (rateVariance / quotationRate) * 100;

      variances.push({
        lineNo: i + 1,
        field: 'Unit Rate',
        quotationValue: quotationItem.unitRate,
        poValue: poItem.unitRate,
        variance: rateVariance,
        variancePercent: rateVariancePercent,
      });
    }

    // Check amount variance
    const quotationAmount = Number(quotationItem.amount);
    if (Math.abs(poItem.amount - quotationAmount) > 0.01) {
      const amountVariance = poItem.amount - quotationAmount;
      const amountVariancePercent = (amountVariance / quotationAmount) * 100;

      variances.push({
        lineNo: i + 1,
        field: 'Amount',
        quotationValue: quotationItem.amount,
        poValue: poItem.amount,
        variance: amountVariance,
        variancePercent: amountVariancePercent,
      });
    }

    // Check specification changes (critical)
    if (poItem.product !== quotationItem.product ||
        poItem.material !== quotationItem.material ||
        poItem.sizeId !== quotationItem.sizeId) {
      variances.push({
        lineNo: i + 1,
        field: 'Specification',
        quotationValue: `${quotationItem.product} ${quotationItem.material} ${quotationItem.sizeLabel || ''}`,
        poValue: `${poItem.product} ${poItem.material} ${poItem.sizeLabel || ''}`,
        variance: 'SPECIFICATION MISMATCH',
      });

      warnings.push(
        `CRITICAL: Specification mismatch detected on line ${i + 1}. ` +
        'Product/Material/Size differs from quotation. Requires immediate review.'
      );
    }
  }

  // Check if fewer items in PO
  if (poItems.length < quotation.items.length) {
    warnings.push(
      `PO has fewer items (${poItems.length}) than quotation (${quotation.items.length}). ` +
      'Some items from quotation are missing in PO.'
    );
  }

  // Determine if approval required based on variance
  const requiresApproval = determineApprovalRequired(variances, totalVariancePercent);

  return {
    hasVariances: variances.length > 0,
    totalVarianceAmount: totalVariance,
    totalVariancePercent,
    items: variances,
    warnings,
    requiresApproval,
  };
}

/**
 * Determine if variances require management approval
 */
function determineApprovalRequired(
  variances: VarianceItem[],
  totalVariancePercent: number
): boolean {
  // Require approval if:

  // 1. Total amount variance > 5%
  if (Math.abs(totalVariancePercent) > 5) {
    return true;
  }

  // 2. Any specification mismatch (CRITICAL)
  if (variances.some(v => v.field === 'Specification')) {
    return true;
  }

  // 3. Any line item variance > 10%
  if (variances.some(v => v.variancePercent && Math.abs(v.variancePercent) > 10)) {
    return true;
  }

  // 4. Unit rate changes (pricing integrity)
  if (variances.some(v => v.field === 'Unit Rate')) {
    return true;
  }

  return false;
}

/**
 * Generate variance report for display/email
 */
export function generateVarianceReportText(report: VarianceReport): string {
  if (!report.hasVariances) {
    return 'No variances detected. PO matches quotation.';
  }

  let text = '=== PO vs Quotation Variance Report ===\n\n';

  if (report.totalVarianceAmount) {
    text += `Total Amount Variance: ₹${report.totalVarianceAmount.toFixed(2)} `;
    text += `(${report.totalVariancePercent?.toFixed(2)}%)\n\n`;
  }

  if (report.warnings.length > 0) {
    text += 'WARNINGS:\n';
    report.warnings.forEach(warning => {
      text += `⚠️  ${warning}\n`;
    });
    text += '\n';
  }

  if (report.items.length > 0) {
    text += 'Line Item Variances:\n';
    text += '-'.repeat(80) + '\n';

    report.items.forEach(item => {
      if (item.lineNo === 0) return; // Skip summary (already shown above)

      text += `Line ${item.lineNo} - ${item.field}:\n`;
      text += `  Quotation: ${formatValue(item.quotationValue)}\n`;
      text += `  PO: ${formatValue(item.poValue)}\n`;
      text += `  Variance: ${formatValue(item.variance)}`;
      if (item.variancePercent) {
        text += ` (${item.variancePercent.toFixed(2)}%)`;
      }
      text += '\n\n';
    });
  }

  if (report.requiresApproval) {
    text += '\n⚠️  MANAGEMENT APPROVAL REQUIRED\n';
    text += 'Variances exceed acceptable threshold. Please review and approve before proceeding.\n';
  }

  return text;
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
}

/**
 * Log variance detection for audit trail
 */
export async function logVarianceDetection(
  quotationId: string,
  poId: string,
  report: VarianceReport,
  userId: string
) {
  // Log variance detection
  await prisma.auditLog.create({
    data: {
      userId,
      tableName: 'PURCHASE_ORDER',
      recordId: poId,
      action: 'CREATE',
      fieldName: report.hasVariances
        ? `Variances detected. Total variance: ${report.totalVariancePercent?.toFixed(2)}%`
        : 'No variances detected. PO matches quotation.',
      oldValue: JSON.stringify({ quotationId }),
      newValue: JSON.stringify({
        quotationId,
        hasVariances: report.hasVariances,
        totalVariancePercent: report.totalVariancePercent,
        varianceCount: report.items.length,
        requiresApproval: report.requiresApproval,
        warnings: report.warnings,
      }),
      ipAddress: null,
      timestamp: new Date(),
    },
  });
}
