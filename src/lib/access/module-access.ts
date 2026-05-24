/**
 * Module-access helpers shared by the auth layer (session derivation) and the
 * sidebar (nav visibility). Kept free of React / server-only imports so it can
 * be imported from both a NextAuth callback and a client component.
 */

/** The single login that bypasses the production-mode module lockdown. */
export const TEST_USER_EMAIL = "testuser@erp.com";

/**
 * `EmployeeMaster.moduleAccess` is stored as a JSON-stringified array in a
 * LongText column (see the employees API). Parse it back to a string[].
 * Never throws — returns [] on null / empty / malformed input.
 */
export function parseModuleAccess(raw: string | null | undefined): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw as unknown as string[]; // defensive: already parsed
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export interface NavItemMeta {
  roles?: string[];
  moduleKey?: string;
  moduleKeys?: string[];
  productionHidden?: boolean;
}

export interface VisibilityContext {
  userRole: string | undefined;
  userEmail: string | undefined;
  moduleAccess: string[] | undefined;
  isProductionMode: boolean;
}

/**
 * Decide whether a sidebar nav item is visible to a user.
 *
 * Rules (in order):
 *  1. Production lockdown — `productionHidden` items are hidden in production
 *     UNLESS the user is the test user OR has been explicitly granted that
 *     module. (A granted module is always shown — the grant is the authorization.)
 *  2. Module grants are authoritative — a non-admin who has ANY explicit grants
 *     sees a module item iff it is in their grants. The per-item role list is
 *     bypassed for granted users (the grant supersedes the coarse role gate).
 *  3. Role gate — for admins, the test user, items without a moduleKey, or users
 *     with no grants at all, fall back to the item's role list.
 */
export function isNavItemVisible(item: NavItemMeta, ctx: VisibilityContext): boolean {
  const { userRole, userEmail, moduleAccess, isProductionMode } = ctx;
  const isTestUser = userEmail === TEST_USER_EMAIL;
  const isAdminOrAbove = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const grants = moduleAccess ?? [];
  const hasGrants = grants.length > 0;
  const keys = item.moduleKeys ?? (item.moduleKey ? [item.moduleKey] : []);
  const isGranted = keys.length > 0 && keys.some((k) => grants.includes(k));

  // 1. Production lockdown — only the test user or an explicit grant bypasses it.
  if (isProductionMode && item.productionHidden && !isTestUser && !isGranted) {
    return false;
  }

  // 2. Module grants are authoritative for non-admins who have grants.
  if (!isAdminOrAbove && hasGrants && keys.length > 0) {
    return isGranted;
  }

  // 3. Role gate fallback.
  if (item.roles && !(userRole && item.roles.includes(userRole))) {
    return false;
  }

  return true;
}
