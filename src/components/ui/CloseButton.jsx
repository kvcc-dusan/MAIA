import React from "react";
import { cn } from "@/lib/utils";
import { X } from "@/components/icons";

/**
 * Row dismiss affordance (Chronos task/signal tiles).
 *
 * Sized deliberately: a 24px round target around a 14px glyph is 5px of
 * padding per side, which reads as a button. The previous square 24px box
 * with a 4px radius looked like a sharp chip stapled onto a 14px-radius card,
 * and briefly growing it to 28px only widened the gap between the hover
 * surface and the glyph inside it.
 *
 * `aria-label` defaults rather than being required — an icon-only button with
 * no accessible name is silent to a screen reader, and callers shouldn't have
 * to remember.
 */
export function CloseButton({ onClick, className, "aria-label": ariaLabel = "Dismiss", ...props }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-overlay-strong hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <X size={14} />
    </button>
  )
}
