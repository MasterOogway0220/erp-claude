/**
 * Comprehensive Audit Logging System
 * PRD Section 9.2 - Complete audit trail for every create/update/delete operation
 * PRD Section 10 - Mandatory System Controls
 */

import { prisma } from '@/lib/prisma';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT_FOR_APPROVAL = 'SUBMIT_FOR_APPROVAL',
  VOID = 'VOID',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  STATUS_CHANGE = 'STATUS_CHANGE',
  EXPORT = 'EXPORT',
  EMAIL_SENT = 'EMAIL_SENT',
}

export enum AuditModule {
  ENQUIRY = 'ENQUIRY',
  QUOTATION = 'QUOTATION',
  SALES_ORDER = 'SALES_ORDER',
  PURCHASE_REQUISITION = 'PURCHASE_REQUISITION',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  GRN = 'GRN',
  INVENTORY = 'INVENTORY',
  INSPECTION = 'INSPECTION',
  NCR = 'NCR',
  PACKING_LIST = 'PACKING_LIST',
  DISPATCH = 'DISPATCH',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
}

export interface AuditLogEntry {
  userId: string;
  module: AuditModule;
  action: AuditAction;
  documentNo?: string;
  documentId?: string;
  description?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Log an audit entry to the database
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        tableName: entry.module, // Map module to tableName
        recordId: entry.documentId || entry.documentNo || 'N/A',
        action: entry.action,
        fieldName: entry.description || null, // Use description as fieldName for tracking
        oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        ipAddress: entry.ipAddress || null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log to console if database logging fails (fallback)
    console.error('[AUDIT LOG ERROR]', error);
    console.error('[AUDIT DATA]', JSON.stringify(entry, null, 2));
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Log multiple field changes for UPDATE operations
 */
export async function logFieldChanges(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  changes: FieldChange[],
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Log each field change as a separate audit entry for better queryability
    for (const change of changes) {
      await logAudit({
        userId,
        module,
        action: AuditAction.UPDATE,
        documentNo,
        documentId,
        description: `Field '${change.field}' changed`,
        oldValue: change.oldValue,
        newValue: change.newValue,
        ipAddress,
        userAgent,
        metadata: {
          field: change.field,
          changeCount: changes.length,
        },
      });
    }
  } catch (error) {
    console.error('[AUDIT FIELD CHANGES ERROR]', error);
  }
}

/**
 * Compare two objects and return field changes
 */
export function detectFieldChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];

  // If fieldsToTrack is provided, only track those fields
  const fields = fieldsToTrack || Object.keys(newData);

  for (const field of fields) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue;
    }

    // Skip internal fields
    if (field.startsWith('_') || field === 'updatedAt') {
      continue;
    }

    changes.push({
      field,
      oldValue,
      newValue,
    });
  }

  return changes;
}

/**
 * Extract IP address from Next.js request headers
 */
export function getIpAddress(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}

/**
 * Log CREATE operation
 */
export async function logCreate(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  data: any,
  ipAddress?: string,
  userAgent?: string,
  description?: string
): Promise<void> {
  await logAudit({
    userId,
    module,
    action: AuditAction.CREATE,
    documentNo,
    documentId,
    description: description || `Created ${module.toLowerCase()} ${documentNo}`,
    newValue: data,
    ipAddress,
    userAgent,
  });
}

/**
 * Log UPDATE operation with field changes
 */
export async function logUpdate(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  oldData: any,
  newData: any,
  ipAddress?: string,
  userAgent?: string,
  fieldsToTrack?: string[]
): Promise<void> {
  const changes = detectFieldChanges(oldData, newData, fieldsToTrack);

  if (changes.length === 0) {
    return; // No changes to log
  }

  await logFieldChanges(
    userId,
    module,
    documentNo,
    documentId,
    changes,
    ipAddress,
    userAgent
  );
}

/**
 * Log DELETE operation (should be rare - only for drafts)
 */
export async function logDelete(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  deletedData: any,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    module,
    action: AuditAction.DELETE,
    documentNo,
    documentId,
    description: reason || `Deleted ${module.toLowerCase()} ${documentNo}`,
    oldValue: deletedData, // Store snapshot of deleted data
    ipAddress,
    userAgent,
    metadata: {
      reason,
      deletedAt: new Date().toISOString(),
    },
  });
}

/**
 * Log APPROVE/REJECT operations
 */
export async function logApproval(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  action: AuditAction.APPROVE | AuditAction.REJECT,
  comment?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    module,
    action,
    documentNo,
    documentId,
    description: `${action === AuditAction.APPROVE ? 'Approved' : 'Rejected'} ${module.toLowerCase()} ${documentNo}`,
    newValue: {
      action,
      comment,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
    metadata: {
      comment,
    },
  });
}

/**
 * Log STATUS_CHANGE operations (e.g., inventory status changes)
 */
export async function logStatusChange(
  userId: string,
  module: AuditModule,
  documentNo: string,
  documentId: string,
  oldStatus: string,
  newStatus: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    module,
    action: AuditAction.STATUS_CHANGE,
    documentNo,
    documentId,
    description: `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    ipAddress,
    userAgent,
    metadata: {
      oldStatus,
      newStatus,
      reason,
    },
  });
}

/**
 * Log LOGIN/LOGOUT operations
 */
export async function logAuthEvent(
  userId: string,
  action: AuditAction.LOGIN | AuditAction.LOGOUT,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    module: AuditModule.AUTH,
    action,
    description: `User ${action === AuditAction.LOGIN ? 'logged in' : 'logged out'}`,
    ipAddress,
    userAgent,
    metadata,
  });
}

/**
 * Log EMAIL_SENT operations
 */
export async function logEmailSent(
  userId: string,
  module: AuditModule,
  documentNo: string,
  recipient: string,
  subject: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    module,
    action: AuditAction.EMAIL_SENT,
    documentNo,
    description: `Email sent to ${recipient}`,
    metadata: {
      recipient,
      subject,
      sentAt: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Query audit logs (for admin audit trail view)
 */
export async function getAuditLogs(filters: {
  userId?: string;
  module?: AuditModule;
  action?: AuditAction;
  documentNo?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.module) where.module = filters.module;
  if (filters.action) where.action = filters.action;
  if (filters.documentNo) where.documentNo = { contains: filters.documentNo };

  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Middleware helper to extract audit context from Next.js request
 */
export function getAuditContext(request: Request, session: any) {
  const headers = request.headers;

  return {
    userId: session?.user?.id,
    ipAddress: getIpAddress(headers),
    userAgent: getUserAgent(headers),
  };
}
