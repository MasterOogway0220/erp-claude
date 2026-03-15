import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Page Not Found</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
