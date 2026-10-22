import { timingSafeEqual } from "node:crypto";

/**
 * Compare a presented secret against the configured one in constant time.
 * An unset expected secret never matches, so a missing env var fails closed.
 */
export function secretEquals(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when an `Authorization: Bearer <secret>` header carries the configured secret. */
export function bearerMatches(header: string | null | undefined, expected: string | undefined): boolean {
  return secretEquals(header?.startsWith("Bearer ") ? header.slice(7) : null, expected);
}
