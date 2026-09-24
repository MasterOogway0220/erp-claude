import { NextRequest, NextResponse } from "next/server";
import { RefreshBusyError, refreshSandboxCopy } from "@/lib/sandbox/refresh";

// Nightly rebuild of the sandbox login's sbx_* table copies from the real
// tables, so Akash starts each day on current data. Wipes whatever he changed.
// Scheduled from vercel.json (21:30 UTC = 03:00 IST).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Same guard as cron/rfq-reminders: Vercel sends `Authorization: Bearer
  // $CRON_SECRET`, and without the secret the endpoint refuses outright.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });

  try {
    const result = await refreshSandboxCopy(databaseUrl);
    console.log("[sandbox] nightly refresh", result);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RefreshBusyError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[sandbox] nightly refresh failed:", error);
    return NextResponse.json({ error: "Sandbox refresh failed" }, { status: 500 });
  }
}
