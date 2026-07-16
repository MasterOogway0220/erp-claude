import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

export async function createAuditLog(params: {
  tableName: string;
  recordId: string;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  companyId?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tableName: params.tableName,
        recordId: params.recordId,
        action: params.action,
        fieldName: params.fieldName || null,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        userId: params.userId || null,
        companyId: params.companyId || null,
      },
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}
