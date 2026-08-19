/**
 * Telling a database outage apart from a wrong password, on the login screen.
 *
 * next-auth collapses every `authorize()` failure into one generic error code,
 * so a `prisma.user.findUnique` that could not reach the database arrives at
 * the login page looking exactly like a bad password — and the page said
 * "Invalid email or password". That message has twice sent people hunting for
 * password problems during what was actually a connectivity outage: Hostinger
 * drops this app's connections to srv1128:3306 when the Remote MySQL allowlist
 * stops covering the deployment's egress IPs (see the bom1 -> sin1 region move
 * in commit 5764432).
 *
 * The database being unreachable is not something the app can fix — the fix is
 * the allowlist in hPanel. What the app can do is stop lying about which of the
 * two failures just happened.
 */

/** Shown instead of "invalid password" when the database cannot be reached. */
export const DB_DOWN_MESSAGE =
  "Can't reach the database, so logins can't be checked right now. This is not your password. " +
  "Send this to IT: open /api/health?deep=1 — if `tcp.reachable` is false the database host is " +
  "dropping this server's connections, and the fix is the Remote MySQL allowlist in hPanel, not the app.";

/**
 * Was the sign-in rejected because the database is unreachable, rather than
 * because the credentials were wrong?
 *
 * Only ever called on the failure path, so a successful login pays nothing.
 * Any doubt answers `false`: telling someone with a genuinely wrong password
 * that the database is down is its own wrong turn.
 */
export async function databaseIsDown(): Promise<boolean> {
  try {
    // ?deep=1 rather than the plain check: the plain one goes through Prisma's
    // pool and takes the full 15s acquire timeout to fail, on top of the 15s
    // the sign-in just spent. The deep probe opens a bare socket and gives up
    // after 5s, so a dropped connection is identified in seconds.
    const res = await fetch("/api/health?deep=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const body = await res.json().catch(() => null);
    return interpretHealth(body);
  } catch {
    return false;
  }
}

/** The decision itself, split out so it can be tested without a network. */
export function interpretHealth(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as { error?: unknown; tcp?: { reachable?: unknown }; driver?: { connected?: unknown } };
  if (b.error) return true; // DATABASE_URL missing entirely
  // Both probes must be read: the network can be fine while MySQL itself
  // refuses the host ("Host is not allowed to connect"), which is the same
  // allowlist problem seen one layer up.
  return b.tcp?.reachable === false || b.driver?.connected === false;
}
