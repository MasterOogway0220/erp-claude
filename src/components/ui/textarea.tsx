import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border/60 placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm resize-none transition-colors duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
