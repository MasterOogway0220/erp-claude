"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * Shown only to the sandbox login. Says plainly that nothing here is real,
 * when the copy was last taken, and offers "Reset Sandbox" (re-copy from real
 * data now, discarding the sandbox user's changes).
 */
export function SandboxBanner() {
  const { data: session } = useSession();
  const isSandbox = !!session?.user?.isSandbox;
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSandbox) return;
    fetch("/api/sandbox")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLastRefreshAt(d?.lastRefreshAt ?? null))
      .catch(() => {});
  }, [isSandbox]);

  if (!isSandbox) return null;

  async function reset() {
    if (!confirm("Reset Sandbox? Everything you changed is discarded and the sandbox is re-copied from the real data.")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/sandbox", { method: "POST" });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
      setBusy(false);
    }
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-amber-400 px-4 py-2 text-sm text-amber-950">
      <strong className="tracking-wide">SANDBOX MODE</strong>
      <span className="flex-1 min-w-[16rem]">
        Changes you make are visible only to you and never touch real data.
        {lastRefreshAt && <> Data copied {new Date(lastRefreshAt).toLocaleString()}; refreshed nightly.</>}
        {error && <span className="ml-2 font-semibold">{error}</span>}
      </span>
      <Button size="sm" variant="outline" className="border-amber-950 bg-transparent" onClick={reset} disabled={busy}>
        {busy ? "Resetting…" : "Reset Sandbox"}
      </Button>
    </div>
  );
}
