import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
