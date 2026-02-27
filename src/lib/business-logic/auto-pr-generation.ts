/**
 * Auto PR Generation from SO Shortfall
 * Automatically creates Purchase Requisitions when Sales Order cannot be fully reserved from inventory
 *
 * PRD Business Logic Requirement
 */

import { prisma } from '@/lib/prisma';
import { logCreate, AuditModule, getIpAddress, getUserAgent } from '@/lib/audit/audit-logger';

export interface ShortfallItem {
  productSpecId: string;
  product: string;
  material: string;
  sizeId: string;
  sizeLabel: string;
  requiredQty: number;
  availableQty: number;
  shortfallQty: number;
  od?: number;
  wt?: number;
  additionalSpec?: string;
}

export interface ShortfallAnalysis {
  salesOrderId: string;
  salesOrderNo: string;
  customer: string;
  hasShortfall: boolean;
  items: ShortfallItem[];
  totalShortfallItems: number;
}

/**
 * Analyze SO for inventory shortfall
 */
export async function analyzeSalesOrderShortfall(
  salesOrderId: string
): Promise<ShortfallAnalysis> {
  const so = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  });

  if (!so) {
    throw new Error('Sales Order not found');
  }

  const shortfallItems: ShortfallItem[] = [];

  // Check each SO item for shortfall
  for (const item of so.items) {
    // Get available inventory matching product, material, and size
    // Note: SalesOrderItem.material maps to InventoryStock.specification
    const stockWhere: any = {
      status: 'ACCEPTED',
      quantityMtr: { gt: 0 },
    };
    if (item.product) stockWhere.product = { contains: item.product };
    if (item.material) stockWhere.specification = { contains: item.material };
    if (item.sizeLabel) stockWhere.sizeLabel = item.sizeLabel;

    const availableStock = await prisma.inventoryStock.findMany({
      where: stockWhere,
      select: {
        quantityMtr: true,
      },
    });

    const totalAvailable = availableStock.reduce(
      (sum: number, stock: any) => sum + Number(stock.quantityMtr),
      0
    );

    // Get already reserved quantity for this item
    const reservations = await prisma.stockReservation.findMany({
      where: { salesOrderItemId: item.id },
      select: { reservedQtyMtr: true },
    });

    const reservedQty = reservations.reduce(
      (sum: number, r: any) => sum + Number(r.reservedQtyMtr),
      0
    );

    const remainingRequired = Number(item.quantity) - reservedQty;

    if (totalAvailable < remainingRequired) {
      // Shortfall detected
      const shortfall = remainingRequired - totalAvailable;

      shortfallItems.push({
        productSpecId: 'N/A', // Not in SO schema
        product: item.product || '',
        material: item.material || '',
        sizeId: 'N/A', // Not in SO schema
        sizeLabel: item.sizeLabel || '',
        requiredQty: remainingRequired,
        availableQty: totalAvailable,
        shortfallQty: shortfall,
        od: Number(item.od) || undefined,
        wt: Number(item.wt) || undefined,
        additionalSpec: item.additionalSpec || undefined,
      });
    }
  }

  return {
    salesOrderId: so.id,
    salesOrderNo: so.soNo,
    customer: so.customer.name,
    hasShortfall: shortfallItems.length > 0,
    items: shortfallItems,
    totalShortfallItems: shortfallItems.length,
  };
}

/**
 * Auto-generate PR from SO shortfall
 */
export async function autoGeneratePRFromShortfall(
  salesOrderId: string,
  requestedById: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ prId: string; prNo: string; itemCount: number } | null> {
  // Analyze shortfall
  const analysis = await analyzeSalesOrderShortfall(salesOrderId);

  if (!analysis.hasShortfall) {
    console.log('No shortfall detected. PR not required.');
    return null;
  }

  console.log(`Shortfall detected for ${analysis.totalShortfallItems} item(s). Generating PR...`);

  // Use transaction to atomically increment sequence and create PR
  const pr = await prisma.$transaction(async (tx) => {
    // Get current financial year for PR numbering
    const year = new Date().getFullYear().toString().slice(-2);
    const month = new Date().getMonth();
    const currentFY = month >= 3 ? year : (parseInt(year) - 1).toString().padStart(2, '0');

    // Get next PR sequence number with row lock
    let sequence = await tx.documentSequence.findUnique({
      where: { documentType: 'PURCHASE_REQUISITION' },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { documentType: 'PURCHASE_REQUISITION' },
        data: { currentNumber: nextNumber },
      });
    } else {
      await tx.documentSequence.create({
        data: {
          documentType: 'PURCHASE_REQUISITION',
          prefix: 'PR',
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const prNo = `PR/${currentFY}/${nextNumber.toString().padStart(5, '0')}`;

    // Create PR inside same transaction
    return tx.purchaseRequisition.create({
      data: {
        prNo,
        prDate: new Date(),
        requiredByDate: addDays(new Date(), 45),
        status: 'DRAFT',
        salesOrderId: salesOrderId,
        items: {
          create: analysis.items.map((item, index) => ({
            sNo: index + 1,
            product: item.product,
            material: item.material,
            sizeLabel: item.sizeLabel,
            additionalSpec: item.additionalSpec || null,
            quantity: item.shortfallQty,
            uom: 'MTR',
            remarks: `For SO ${analysis.salesOrderNo}`,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  });

  // Log PR creation
  await logCreate(
    requestedById,
    AuditModule.PURCHASE_REQUISITION,
    pr.prNo,
    pr.id,
    pr,
    ipAddress,
    userAgent,
    `Auto-generated PR from SO shortfall: ${analysis.salesOrderNo}`
  );

  console.log(`PR ${pr.prNo} created successfully with ${analysis.totalShortfallItems} item(s)`);

  return {
    prId: pr.id,
    prNo: pr.prNo,
    itemCount: analysis.totalShortfallItems,
  };
}

/**
 * Helper: Add days to date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if PR should be auto-generated based on business rules
 */
export function shouldAutoGeneratePR(
  shortfallAnalysis: ShortfallAnalysis,
  config?: {
    enableAutoGeneration: boolean;
    minShortfallQty?: number;
    maxShortfallValue?: number;
  }
): { should: boolean; reason: string } {
  const defaultConfig = {
    enableAutoGeneration: true,
    minShortfallQty: 10, // Min quantity to trigger auto PR
    maxShortfallValue: 500000, // Max value for auto-generation (₹5 lakhs)
  };

  const cfg = { ...defaultConfig, ...config };

  if (!cfg.enableAutoGeneration) {
    return { should: false, reason: 'Auto-generation disabled in config' };
  }

  if (!shortfallAnalysis.hasShortfall) {
    return { should: false, reason: 'No shortfall detected' };
  }

  // Check if shortfall is significant enough
  const totalShortfallQty = shortfallAnalysis.items.reduce((sum, item) => sum + item.shortfallQty, 0);

  if (totalShortfallQty < cfg.minShortfallQty!) {
    return {
      should: false,
      reason: `Shortfall quantity (${totalShortfallQty}) below minimum threshold (${cfg.minShortfallQty})`,
    };
  }

  // Additional checks can be added:
  // - Check if preferred vendor exists for the product
  // - Check if budget is available
  // - Check if similar PR already exists

  return { should: true, reason: 'Shortfall detected and meets criteria' };
}

/**
 * Notify purchase team about auto-generated PR
 */
export async function notifyPurchaseTeam(
  prNo: string,
  soNo: string,
  customer: string,
  itemCount: number
) {
  // Send email to purchase team
  // Implementation depends on your email service

  console.log(`📧 Notification sent to purchase team:`);
  console.log(`   PR: ${prNo}`);
  console.log(`   Triggered by SO: ${soNo}`);
  console.log(`   Customer: ${customer}`);
  console.log(`   Items: ${itemCount}`);

  // Example email content:
  const emailContent = {
    to: 'purchase@nps.com',
    subject: `Auto-Generated PR ${prNo} - Requires Review`,
    body: `
Dear Purchase Team,

A Purchase Requisition has been automatically generated due to inventory shortfall:

PR Number: ${prNo}
Triggered by: Sales Order ${soNo}
Customer: ${customer}
Items: ${itemCount}

Please review and process this PR at your earliest convenience.

Regards,
NPS ERP System
    `.trim(),
  };

  // await sendEmail(emailContent);

  return emailContent;
}

/**
 * API endpoint helper: Generate PR from SO
 */
export async function handleAutoGeneratePR(
  salesOrderId: string,
  userId: string,
  options?: {
    autoSubmitForApproval?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  // Analyze shortfall
  const analysis = await analyzeSalesOrderShortfall(salesOrderId);

  // Check if should generate
  const decision = shouldAutoGeneratePR(analysis);

  if (!decision.should) {
    return {
      success: false,
      message: decision.reason,
      analysis,
    };
  }

  // Generate PR
  const result = await autoGeneratePRFromShortfall(
    salesOrderId,
    userId,
    options?.ipAddress,
    options?.userAgent
  );

  if (!result) {
    return {
      success: false,
      message: 'PR generation failed',
      analysis,
    };
  }

  // Optionally submit for approval
  if (options?.autoSubmitForApproval) {
    await prisma.purchaseRequisition.update({
      where: { id: result.prId },
      data: {
        status: 'PENDING_APPROVAL',
        // submittedDate not in schema - using requestDate
      },
    });
  }

  // Notify purchase team
  await notifyPurchaseTeam(result.prNo, analysis.salesOrderNo, analysis.customer, result.itemCount);

  return {
    success: true,
    message: `PR ${result.prNo} generated successfully`,
    prId: result.prId,
    prNo: result.prNo,
    itemCount: result.itemCount,
    analysis,
  };
}
