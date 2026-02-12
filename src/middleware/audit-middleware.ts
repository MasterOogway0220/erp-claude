/**
 * Audit Logging Middleware for Next.js API Routes
 * Automatically logs all API operations to audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit, AuditAction, AuditModule, getIpAddress, getUserAgent } from '@/lib/audit/audit-logger';

/**
 * Wraps an API route handler with automatic audit logging
 *
 * Usage:
 * export const POST = withAudit(AuditModule.QUOTATION, async (request) => {
 *   // Your API logic here
 * });
 */
export function withAudit(
  module: AuditModule,
  handler: (request: NextRequest, auditContext: AuditContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditContext: AuditContext = {
      userId: session.user.id,
      ipAddress: getIpAddress(request.headers),
      userAgent: getUserAgent(request.headers),
      module,
    };

    // Call the actual handler
    return handler(request, auditContext);
  };
}

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  module: AuditModule;
}

/**
 * Helper to log after successful operation
 * Call this after creating/updating/deleting a record
 */
export async function auditLog(
  context: AuditContext,
  action: AuditAction,
  documentNo: string,
  data?: any
) {
  await logAudit({
    userId: context.userId,
    module: context.module,
    action,
    documentNo,
    description: `${action} ${context.module} ${documentNo}`,
    newValue: data,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}
