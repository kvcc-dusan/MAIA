import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Flat control — see ui/input.jsx for the rationale (tracked divergence).
        "flex field-sizing-content min-h-16 w-full resize-none rounded-3xl border border-border bg-transparent px-3 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Textarea }
