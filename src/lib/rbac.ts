/**
 * Role-Based Access Control (RBAC) Utility
 * PRD §3.1 - Every screen/action governed by user role
 * ISO 9001:2018 Clause 5.3 - Roles & responsibilities
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export type RBACAction = "read" | "write" | "delete" | "approve";

/**
 * Module-to-role access matrix
 * MANAGEMENT has read access to all modules
 * ADMIN has full access to all modules
 */
const MODULE_ACCESS: Record<string, Record<RBACAction, UserRole[]>> = {
  quotation: {
    read: ["SALES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["SALES", "SUPER_ADMIN"],
    delete: ["SALES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  salesOrder: {
    read: ["SALES", "PURCHASE", "STORES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["SALES", "SUPER_ADMIN"],
    delete: ["SALES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  purchaseRequisition: {
    read: ["PURCHASE", "SALES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["PURCHASE", "SALES", "SUPER_ADMIN"],
    delete: ["PURCHASE", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  purchaseOrder: {
    read: ["PURCHASE", "STORES", "QC", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["PURCHASE", "SUPER_ADMIN"],
    delete: ["PURCHASE", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  grn: {
    read: ["STORES", "QC", "PURCHASE", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["STORES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  inventory: {
    read: ["STORES", "SALES", "QC", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  stockIssue: {
    read: ["STORES", "SALES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  inspection: {
    read: ["QC", "STORES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["QC", "SUPER_ADMIN"],
    delete: ["QC", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  qcRelease: {
    read: ["QC", "STORES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["QC", "SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  ncr: {
    read: ["QC", "PURCHASE", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["QC", "SUPER_ADMIN"],
    delete: ["QC", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  mtc: {
    read: ["QC", "STORES", "SALES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["QC", "STORES", "SUPER_ADMIN"],
    delete: ["QC", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  labLetter: {
    read: ["QC", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["QC", "SUPER_ADMIN"],
    delete: ["QC", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  packingList: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["STORES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  dispatchNote: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["STORES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  invoice: {
    read: ["ACCOUNTS", "SALES", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["ACCOUNTS", "SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  payment: {
    read: ["ACCOUNTS", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["ACCOUNTS", "SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
  masters: {
    read: ["SUPER_ADMIN", "SALES", "PURCHASE", "STORES", "QC", "ACCOUNTS", "MANAGEMENT"],
    write: ["SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["SUPER_ADMIN"],
  },
  reports: {
    read: ["SALES", "PURCHASE", "STORES", "QC", "ACCOUNTS", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["SUPER_ADMIN"],
  },
  admin: {
    read: ["SUPER_ADMIN"],
    write: ["SUPER_ADMIN"],
    delete: ["SUPER_ADMIN"],
    approve: ["SUPER_ADMIN"],
  },
  dispatch: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "SUPER_ADMIN"],
    write: ["STORES", "SUPER_ADMIN"],
    delete: ["STORES", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "SUPER_ADMIN"],
  },
};

export interface AuthResult {
  authorized: boolean;
  session: any;
  response?: NextResponse;
}

/**
 * Check if user has access to a module action.
 * Returns session if authorized, or an error response if not.
 */
export async function checkAccess(
  module: keyof typeof MODULE_ACCESS,
  action: RBACAction
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const allowedRoles = MODULE_ACCESS[module]?.[action];
  if (!allowedRoles) {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        { error: "Access configuration not found" },
        { status: 500 }
      ),
    };
  }

  const userRole = session.user?.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        {
          error: `Access denied. Your role (${userRole}) does not have ${action} access to this module.`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

/**
 * Simple session check (authentication only, no role check).
 * Use for endpoints accessible to all authenticated users (e.g., search, health).
 */
export async function checkAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { authorized: true, session };
}
