import { prisma } from "./prisma";

export async function createAuditLog(params: {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "SUBMIT_FOR_APPROVAL" | "STATUS_CHANGE" | "EMAIL_SENT";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
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
      },
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}
