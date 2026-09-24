import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/rbac";
import { realPrisma } from "@/lib/prisma";
import { RefreshBusyError, lastRefreshAt, refreshSandboxCopy } from "@/lib/sandbox/refresh";

// Each reset copies the whole database on the live server. One every couple
// of minutes is plenty for a person, and stops a stuck button from hammering it.
// Overridable only so the end-to-end test can exercise it in seconds.
const RESET_COOLDOWN_MS = Number(process.env.SANDBOX_RESET_COOLDOWN_MS ?? 2 * 60 * 1000);

// The sandbox banner's endpoint. Sandbox logins only.
//   GET  -> when the sbx_* copies were last rebuilt
//   POST -> "Reset Sandbox": rebuild them now from real data (wipes the
//           sandbox user's changes; the same operation as the nightly cron)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function sandboxOnly() {
  const auth = await checkAuth();
  if (!auth.authorized) return auth.response!;
  if (!auth.session!.user.isSandbox) {
    return NextResponse.json({ error: "Only the sandbox login can do this" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await sandboxOnly();
  if (denied) return denied;
  return NextResponse.json({ lastRefreshAt: await lastRefreshAt(realPrisma) });
}

export async function POST() {
  const denied = await sandboxOnly();
  if (denied) return denied;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });
  const last = await lastRefreshAt(realPrisma);
  if (last && Date.now() - last.getTime() < RESET_COOLDOWN_MS) {
    return NextResponse.json({ error: "The sandbox was refreshed moments ago. Try again in a couple of minutes." }, { status: 429 });
  }
  try {
    const result = await refreshSandboxCopy(databaseUrl);
    console.log("[sandbox] reset by sandbox user", result);
    return NextResponse.json({ ...result, lastRefreshAt: await lastRefreshAt(realPrisma) });
  } catch (error) {
    if (error instanceof RefreshBusyError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[sandbox] reset failed:", error);
    return NextResponse.json({ error: "Sandbox reset failed" }, { status: 500 });
  }
}
