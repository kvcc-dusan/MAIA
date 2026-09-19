import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Flat control: no fill, one hairline border, one radius. Focus and
        // error speak through the border colour alone — no glow rings.
        // (Tracked divergence from the shadcn registry — same caveat as
        // ui/command.jsx: `shadcn add input` reverts this.)
        "h-9 w-full min-w-0 rounded-xl border border-border bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Input }
