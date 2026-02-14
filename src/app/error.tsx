"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">
        An unexpected error occurred. Please try again or contact your administrator if the problem persists.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
