import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder while a page fetches its data. Shaped like the common page
 * (title and action, a filter bar, a table) so the layout does not jump when
 * the content arrives, and the screen never sits blank behind a lone spinner.
 */
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading</span>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2 rounded-md border p-4">
        <Skeleton className="h-5 w-full" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
