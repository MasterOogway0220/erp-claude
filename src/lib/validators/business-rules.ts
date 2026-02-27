/**
 * Business Rule Validators
 * PRD Section 10 - Mandatory System Controls
 */

import { prisma } from '@/lib/prisma';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * PRD Section 10: Mandatory Attachments
 * MTC must be uploaded at GRN, Inspection report at QC release
 */

export async function validateMandatoryAttachments(
  entityType: 'GRN' | 'INSPECTION' | 'NCR',
  entityId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    switch (entityType) {
      case 'GRN': {
        const grn = await prisma.gRNItem.findUnique({
          where: { id: entityId },
          select: {
            mtcNo: true,
            mtcDocumentPath: true,
          },
        });

        if (!grn) {
          errors.push('GRN not found');
          break;
        }

        // MTC is mandatory for GRN
        if (!grn.mtcNo || !grn.mtcDocumentPath) {
          errors.push('MTC (Material Test Certificate) is mandatory. Please upload MTC document and enter MTC number.');
        }

        break;
      }

      case 'INSPECTION': {
        const inspection = await prisma.inspection.findUnique({
          where: { id: entityId },
          select: {
            overallResult: true,
            reportPath: true,
          },
        });

        if (!inspection) {
          errors.push('Inspection not found');
          break;
        }

        // Inspection report document is mandatory for QC release
        if (inspection.overallResult === 'PASS' || inspection.overallResult === 'FAIL') {
          if (!inspection.reportPath) {
            errors.push('Inspection report document is mandatory before releasing QC result.');
          }
        }

        break;
      }

      case 'NCR': {
        const ncr = await prisma.nCR.findUnique({
          where: { id: entityId },
          select: {
            evidencePaths: true,
            status: true,
          },
        });

        if (!ncr) {
          errors.push('NCR not found');
          break;
        }

        // Evidence documents recommended for NCRs
        // evidencePaths is JsonValue, check if it's empty
        if (!ncr.evidencePaths || (Array.isArray(ncr.evidencePaths) && ncr.evidencePaths.length === 0)) {
          errors.push('Evidence documents are required for NCR. Please upload photos or reports showing the non-conformance.');
        }

        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errors: ['Validation check failed due to system error'],
    };
  }
}

/**
 * PRD Section 10: No Deletion of Approved Records
 * Approved quotations, POs, invoices cannot be deleted
 */

export async function canDeleteRecord(
  entityType: 'QUOTATION' | 'PURCHASE_ORDER' | 'SALES_ORDER' | 'INVOICE' | 'GRN',
  entityId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    switch (entityType) {
      case 'QUOTATION': {
        const quotation = await prisma.quotation.findUnique({
          where: { id: entityId },
          select: {
            quotationNo: true,
            status: true,
            _count: {
              select: {
                salesOrders: true, // Check if SOs are linked
              },
            },
          },
        });

        if (!quotation) {
          errors.push('Quotation not found');
          break;
        }

        // Cannot delete approved quotations
        if (quotation.status === 'APPROVED') {
          errors.push(`Cannot delete approved quotation ${quotation.quotationNo}. Use 'Void' or 'Cancel' instead.`);
        }

        // Cannot delete if SOs are linked
        if (quotation._count.salesOrders > 0) {
          errors.push(`Cannot delete quotation ${quotation.quotationNo}. It has ${quotation._count.salesOrders} linked Sales Order(s).`);
        }

        break;
      }

      case 'PURCHASE_ORDER': {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: entityId },
          select: {
            poNo: true,
            status: true,
            items: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!po) {
          errors.push('Purchase Order not found');
          break;
        }

        // Cannot delete open or received POs
        if (po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'FULLY_RECEIVED') {
          errors.push(`Cannot delete open/received PO ${po.poNo}. Use 'Cancel' instead with proper reason.`);
        }

        // Cannot delete if material received
        // Note: Would need to check GRN table for this PO
        // Simplified check for now
        if (po.status === 'PARTIALLY_RECEIVED' || po.status === 'CLOSED') {
          errors.push(`Cannot delete PO ${po.poNo}. Material has been received.`);
        }

        break;
      }

      case 'SALES_ORDER': {
        const so = await prisma.salesOrder.findUnique({
          where: { id: entityId },
          select: {
            soNo: true,
            status: true,
            _count: {
              select: {
                packingLists: true,
                invoices: true,
              },
            },
          },
        });

        if (!so) {
          errors.push('Sales Order not found');
          break;
        }

        // Cannot delete if dispatched
        if (so._count.packingLists > 0 || so._count.invoices > 0) {
          errors.push(`Cannot delete SO ${so.soNo}. Material has been dispatched or invoiced.`);
        }

        // Cannot delete closed SOs
        if (so.status === 'CLOSED' || so.status === 'FULLY_DISPATCHED') {
          errors.push(`Cannot delete closed/dispatched SO ${so.soNo}.`);
        }

        break;
      }

      case 'INVOICE': {
        const invoice = await prisma.invoice.findUnique({
          where: { id: entityId },
          select: {
            invoiceNo: true,
            status: true,
            _count: {
              select: {
                paymentReceipts: true,
              },
            },
          },
        });

        if (!invoice) {
          errors.push('Invoice not found');
          break;
        }

        // Cannot delete invoices (per PRD)
        errors.push(`Cannot delete invoice ${invoice.invoiceNo}. Invoices cannot be deleted as per compliance requirements. Use 'Credit Note' for corrections.`);

        // Definitely cannot delete if payment received
        if (invoice._count.paymentReceipts > 0) {
          errors.push(`Invoice ${invoice.invoiceNo} has payment receipts. Deletion is strictly prohibited.`);
        }

        break;
      }

      case 'GRN': {
        const grn = await prisma.goodsReceiptNote.findUnique({
          where: { id: entityId },
          include: {
            items: {
              select: {
                _count: {
                  select: {
                    inspections: true,
                    inventoryStocks: true,
                  },
                },
              },
            },
          },
        });

        if (!grn) {
          errors.push('GRN not found');
          break;
        }

        // Cannot delete if any item has inspections
        const hasInspections = grn.items.some(item => item._count.inspections > 0);
        if (hasInspections) {
          errors.push(`Cannot delete GRN ${grn.grnNo}. Inspection has been completed.`);
        }

        // Cannot delete if any item added to inventory
        const hasInventory = grn.items.some(item => item._count.inventoryStocks > 0);
        if (hasInventory) {
          errors.push(`Cannot delete GRN ${grn.grnNo}. Material has been added to inventory.`);
        }

        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Delete validation error:', error);
    return {
      isValid: false,
      errors: ['Validation check failed due to system error'],
    };
  }
}

/**
 * PRD Section 10: FIFO Enforcement
 * Stock issue must follow First-In-First-Out by MTC date
 */

export async function validateFIFOReservation(
  product: string,
  sizeLabel: string,
  requestedHeatNumbers: string[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get available stock sorted by MTC date (FIFO)
    const availableStock = await prisma.inventoryStock.findMany({
      where: {
        product,
        sizeLabel,
        status: 'ACCEPTED',
        quantityMtr: {
          gt: 0,
        },
      },
      orderBy: {
        mtcDate: 'asc', // Oldest first (FIFO)
      },
      select: {
        heatNo: true,
        mtcDate: true,
        quantityMtr: true,
      },
    });

    if (availableStock.length === 0) {
      errors.push('No available stock found for the selected product and size.');
      return { isValid: false, errors };
    }

    // Check if requested heat numbers follow FIFO order
    const oldestHeatNumbers = availableStock
      .slice(0, requestedHeatNumbers.length)
      .map((s: any) => s.heatNo)
      .filter((h: any) => h !== null);

    // Check if requested heats match oldest heats
    const nonFIFOHeats = requestedHeatNumbers.filter(
      requestedHeat => !oldestHeatNumbers.includes(requestedHeat)
    );

    if (nonFIFOHeats.length > 0) {
      warnings.push(
        `Warning: Selected heat numbers do not follow FIFO order. ` +
        `Oldest available heats are: ${oldestHeatNumbers.join(', ')}. ` +
        `Consider reserving oldest stock first to maintain FIFO.`
      );
    }

    return {
      isValid: true, // FIFO is a warning, not a blocker (business can override)
      errors: [],
      warnings,
    };
  } catch (error) {
    console.error('FIFO validation error:', error);
    return {
      isValid: false,
      errors: ['FIFO validation check failed due to system error'],
    };
  }
}

/**
 * PRD Section 10: Traceability Enforcement
 * Every transaction must link to its predecessor
 */

export async function validateTraceability(
  entityType: 'SALES_ORDER' | 'PURCHASE_ORDER' | 'GRN' | 'DISPATCH',
  data: any
): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    switch (entityType) {
      case 'SALES_ORDER': {
        // SO must link to either Quotation or direct customer PO
        if (!data.quotationId && !data.customerPoNo) {
          errors.push('Sales Order must link to either an approved Quotation or Customer PO reference.');
        }

        // If quotation linked, verify it's approved
        if (data.quotationId) {
          const quotation = await prisma.quotation.findUnique({
            where: { id: data.quotationId },
            select: { status: true, quotationNo: true },
          });

          if (!quotation) {
            errors.push('Linked quotation not found.');
          } else if (quotation.status !== 'APPROVED' && quotation.status !== 'SENT') {
            errors.push(`Cannot create SO from quotation ${quotation.quotationNo} with status "${quotation.status}". Quotation must be Approved or Sent.`);
          }
        }

        break;
      }

      case 'PURCHASE_ORDER': {
        // PO should ideally link to PR, but can be created directly
        // This is optional traceability
        if (data.prId) {
          const pr = await prisma.purchaseRequisition.findUnique({
            where: { id: data.prId },
            select: { status: true },
          });

          if (pr && pr.status !== 'APPROVED') {
            errors.push('Cannot create PO from unapproved PR. Please get PR approved first.');
          }
        }

        break;
      }

      case 'GRN': {
        // GRN must link to PO
        if (!data.poId) {
          errors.push('GRN must be linked to a Purchase Order.');
        }

        // Verify PO exists and is open
        if (data.poId) {
          const po = await prisma.purchaseOrder.findUnique({
            where: { id: data.poId },
            select: { status: true, poNo: true },
          });

          if (!po) {
            errors.push('Linked Purchase Order not found.');
          } else if (po.status === 'DRAFT' || po.status === 'CANCELLED') {
            errors.push(`Cannot create GRN for ${po.status.toLowerCase()} PO ${po.poNo}.`);
          }
        }

        break;
      }

      case 'DISPATCH': {
        // Dispatch must link to SO
        if (!data.soId) {
          errors.push('Dispatch/Packing List must be linked to a Sales Order.');
        }

        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Traceability validation error:', error);
    return {
      isValid: false,
      errors: ['Traceability validation check failed due to system error'],
    };
  }
}

/**
 * PRD Section 10: Approval Workflow
 * Quotations, POs above threshold need management approval
 */

export interface ApprovalConfig {
  quotationThreshold: number; // Amount above which approval needed
  poThreshold: number;
  prThreshold: number;
}

const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  quotationThreshold: 100000, // ₹1 lakh
  poThreshold: 100000,
  prThreshold: 50000,
};

export async function requiresApproval(
  entityType: 'QUOTATION' | 'PURCHASE_ORDER' | 'PURCHASE_REQUISITION',
  amount: number,
  config: ApprovalConfig = DEFAULT_APPROVAL_CONFIG
): Promise<boolean> {
  switch (entityType) {
    case 'QUOTATION':
      return amount > config.quotationThreshold;
    case 'PURCHASE_ORDER':
      return amount > config.poThreshold;
    case 'PURCHASE_REQUISITION':
      return amount > config.prThreshold;
    default:
      return false;
  }
}

/**
 * Validate data integrity (foreign key constraints, field validations)
 */

export async function validateDataIntegrity(
  entityType: string,
  data: any
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check for required foreign keys based on entity type
  // This is a basic example - extend as needed

  if (entityType === 'QUOTATION' && !data.customerId) {
    errors.push('Customer is required for quotation.');
  }

  if (entityType === 'PURCHASE_ORDER' && !data.vendorId) {
    errors.push('Vendor is required for purchase order.');
  }

  if (entityType === 'GRN' && !data.heatNo) {
    errors.push('Heat number is mandatory for GRN (traceability requirement).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
