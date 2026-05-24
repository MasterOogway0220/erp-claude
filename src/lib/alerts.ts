import type { AlertType, AlertSeverity, UserRole } from "@prisma/client";

export interface AlertInput {
  companyId: string | null;
  type: AlertType;
  title: string;
  message: string;
  assignedToRole: UserRole;
  relatedModule: string;
  relatedId: string;
  severity?: AlertSeverity;
  dueDate?: Date | null;
}

/**
 * Pure builder for the prisma.alert.create `data` payload (defaults applied).
 * Unit-testable without a DB connection.
 */
export function buildAlertData(input: AlertInput) {
  return {
    companyId: input.companyId,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity ?? ("MEDIUM" as AlertSeverity),
    status: "UNREAD" as const,
    relatedModule: input.relatedModule,
    relatedId: input.relatedId,
    assignedToRole: input.assignedToRole,
    dueDate: input.dueDate ?? null,
  };
}

/**
 * Create an alert in the DB.
 * Never throws — swallows errors so callers' main flows are unaffected.
 * `prisma` is imported lazily so this module can be unit-tested without a DB.
 */
export async function createAlert(input: AlertInput): Promise<void> {
  try {
    const { prisma } = await import("./prisma");
    await prisma.alert.create({ data: buildAlertData(input) });
  } catch (err) {
    console.error("createAlert failed:", err);
  }
}
