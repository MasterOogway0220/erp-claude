"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * The app-wide error boundary. Next.js renders this in place of any page whose
 * client render throws.
 *
 * It used to say only "Something went wrong". That is fine for reassurance and
 * useless for repair: a user reporting a broken screen could describe the
 * symptom but carry no information about the cause, and the message is
 * identical on every page, so it did not even identify which screen failed.
 * The details were logged to the browser console, where nobody outside a
 * developer's machine ever looks.
 *
 * So the failure is still presented calmly, but the cause is now on screen and
 * copyable. What is shown is deliberately limited to Next's `digest` and the
 * error message — not a stack trace, which would be noise to the person
 * reading it and could leak internals. The digest is the value that ties a
 * report to a specific server-side error in the deployment logs, which is the
 * single most useful thing a user can send back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  // `pathname` rather than the router, because this component renders outside
  // a normal page tree and must not itself throw while reporting a throw.
  const where = typeof window === "undefined" ? "" : window.location.pathname;
  const report = [
    where && `Page: ${where}`,
    error.digest && `Reference: ${error.digest}`,
    error.message && `Error: ${error.message}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = () => {
    navigator.clipboard?.writeText(report).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // Clipboard blocked (insecure origin, denied permission). The details
        // are on screen anyway, so this is not worth surfacing as a failure.
      }
    );
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-center text-muted-foreground">
        This screen could not be displayed. Trying again often works. If it
        keeps happening, send the details below to your administrator.
      </p>

      {report ? (
        <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted px-4 py-3 text-left text-xs text-muted-foreground">
          {report}
        </pre>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try Again</Button>
        {report ? (
          <Button variant="outline" onClick={copy}>
            {copied ? "Copied" : "Copy details"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
