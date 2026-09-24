/** Request header carrying the sandbox user's id. Set only by middleware, from a verified JWT. */
export const SANDBOX_HEADER = "x-erp-sandbox";

/**
 * The request headers to forward to the route: any client-supplied sandbox
 * header removed (so nobody can put themselves — or anyone else — into the
 * sandbox), then set again only when the verified token says isSandbox.
 *
 * Kept free of Next imports so middleware and tests can both use it.
 */
export function markSandboxHeaders(
  incoming: Headers,
  token: { id?: string; isSandbox?: boolean } | null
): Headers {
  const headers = new Headers(incoming);
  headers.delete(SANDBOX_HEADER);
  if (token?.isSandbox && token.id) headers.set(SANDBOX_HEADER, token.id);
  return headers;
}
