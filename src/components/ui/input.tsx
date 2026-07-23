import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onWheel, ...props }: React.ComponentProps<"input">) {
  // Browsers spin a focused number input's value on scroll-wheel/trackpad
  // movement, so scrolling a long form silently changes rates and quantities
  // the user never touched. Blur instead, letting the wheel scroll the page.
  const handleWheel =
    type === "number"
      ? (e: React.WheelEvent<HTMLInputElement>) => {
          e.currentTarget.blur()
          onWheel?.(e)
        }
      : onWheel
  return (
    <input
      type={type}
      data-slot="input"
      onWheel={handleWheel}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/50 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-border/60 h-10 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-sm transition-colors duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
        "focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
