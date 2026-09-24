import { headers } from "next/headers";
import { SANDBOX_HEADER } from "./headers";

/**
 * The sandbox user id for the current request, or null for a normal request.
 *
 * Outside a request (scripts, the build, module evaluation) `headers()` throws;
 * that is a normal context, never a sandbox one. The header can only have come
 * from middleware: it strips any client-sent copy on every /api request.
 */
export async function currentSandbox(): Promise<string | null> {
  let h: Awaited<ReturnType<typeof headers>>;
  try {
    h = await headers();
  } catch {
    return null;
  }
  return h.get(SANDBOX_HEADER) || null;
}
