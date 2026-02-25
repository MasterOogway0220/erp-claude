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
    read: ["SALES", "MANAGEMENT", "ADMIN"],
    write: ["SALES", "ADMIN"],
    delete: ["SALES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  salesOrder: {
    read: ["SALES", "PURCHASE", "STORES", "MANAGEMENT", "ADMIN"],
    write: ["SALES", "ADMIN"],
    delete: ["SALES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  purchaseRequisition: {
    read: ["PURCHASE", "SALES", "MANAGEMENT", "ADMIN"],
    write: ["PURCHASE", "SALES", "ADMIN"],
    delete: ["PURCHASE", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  purchaseOrder: {
    read: ["PURCHASE", "STORES", "QC", "MANAGEMENT", "ADMIN"],
    write: ["PURCHASE", "ADMIN"],
    delete: ["PURCHASE", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  grn: {
    read: ["STORES", "QC", "PURCHASE", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["STORES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  inventory: {
    read: ["STORES", "SALES", "QC", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  stockIssue: {
    read: ["STORES", "SALES", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  inspection: {
    read: ["QC", "STORES", "MANAGEMENT", "ADMIN"],
    write: ["QC", "ADMIN"],
    delete: ["QC", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  qcRelease: {
    read: ["QC", "STORES", "MANAGEMENT", "ADMIN"],
    write: ["QC", "ADMIN"],
    delete: ["ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  ncr: {
    read: ["QC", "PURCHASE", "MANAGEMENT", "ADMIN"],
    write: ["QC", "ADMIN"],
    delete: ["QC", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  mtc: {
    read: ["QC", "STORES", "SALES", "MANAGEMENT", "ADMIN"],
    write: ["QC", "STORES", "ADMIN"],
    delete: ["QC", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  labLetter: {
    read: ["QC", "MANAGEMENT", "ADMIN"],
    write: ["QC", "ADMIN"],
    delete: ["QC", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  packingList: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["STORES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  dispatchNote: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["STORES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  invoice: {
    read: ["ACCOUNTS", "SALES", "MANAGEMENT", "ADMIN"],
    write: ["ACCOUNTS", "ADMIN"],
    delete: ["ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  payment: {
    read: ["ACCOUNTS", "MANAGEMENT", "ADMIN"],
    write: ["ACCOUNTS", "ADMIN"],
    delete: ["ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
  },
  masters: {
    read: ["ADMIN", "SALES", "PURCHASE", "STORES", "QC", "ACCOUNTS", "MANAGEMENT"],
    write: ["ADMIN"],
    delete: ["ADMIN"],
    approve: ["ADMIN"],
  },
  reports: {
    read: ["SALES", "PURCHASE", "STORES", "QC", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
    write: ["ADMIN"],
    delete: ["ADMIN"],
    approve: ["ADMIN"],
  },
  admin: {
    read: ["ADMIN"],
    write: ["ADMIN"],
    delete: ["ADMIN"],
    approve: ["ADMIN"],
  },
  dispatch: {
    read: ["STORES", "SALES", "ACCOUNTS", "MANAGEMENT", "ADMIN"],
    write: ["STORES", "ADMIN"],
    delete: ["STORES", "ADMIN"],
    approve: ["MANAGEMENT", "ADMIN"],
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
