import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky page header.
 *
 * NotesPage and LedgerPage each hand-wrote this, with identical class strings
 * down to the tracking value — eyebrow label, count pill, right-aligned
 * actions. One component, so the next page can't invent a sixth variant.
 */
function PageHeader({ eyebrow, count, actions, className, children, ...props }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-sticky flex-none flex flex-wrap items-center justify-between gap-3",
        "border-b border-border-subtle bg-background/80 supports-backdrop-filter:backdrop-blur-xl pt-2 pb-6",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {eyebrow && (
          <span className="ml-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {eyebrow}
          </span>
        )}
        {count != null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export { PageHeader };
