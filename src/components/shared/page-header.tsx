import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  badgeVariant = "secondary",
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-0 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {badge && (
              <Badge variant={badgeVariant} className="text-[11px] font-medium">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 shrink-0 sm:min-w-fit">{children}</div>
        )}
      </div>
    </div>
  );
}
