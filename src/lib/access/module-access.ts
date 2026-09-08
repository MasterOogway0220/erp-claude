/**
 * Module-access helpers shared by the auth layer (session derivation) and the
 * sidebar (nav visibility). Kept free of React / server-only imports so it can
 * be imported from both a NextAuth callback and a client component.
 */

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

// Nav visibility used to live here as `isNavItemVisible`. Every rule it applied
// has now been removed by owner request: the role and grant gates went on
// 2026-07-16, and the production lockdown (which hid modules not yet handed to
// the client behind NEXT_PUBLIC_PRODUCTION_MODE, with `testuser@erp.com` as the
// one bypass) went when every module was opened up on production. With no rules
// left the function could only `return true`, so it and the sidebar's call to it
// are gone rather than kept as ceremony. Restore any of it from git history.
