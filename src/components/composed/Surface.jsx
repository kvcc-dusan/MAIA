import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The one panel primitive.
 *
 * Replaces the 19 distinct hand-written `bg-* + backdrop-blur-* + border-*`
 * class strings that were scattered across the app. Depth now comes from the
 * token elevation ramp rather than stacked black transparencies, so surfaces
 * read correctly without relying on borders alone.
 */
const surfaceVariants = cva("relative", {
  variants: {
    variant: {
      /** Default content panel — cards, list containers, widgets. */
      panel: "bg-card border border-border-subtle",
      /** Floating chrome over content — dock, popovers, sticky headers. */
      glass: "bg-glass/70 supports-backdrop-filter:backdrop-blur-xl border border-border",
      /** Sunken well — inputs, empty states, inset regions. */
      well: "bg-background-subtle border border-border-subtle",
      /** Full-height side rail — sidebars, nav columns. */
      rail: "bg-background-subtle border-r border-border-subtle",
      /** No chrome; use when a parent already supplies the surface. */
      bare: "",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-lg",
      md: "rounded-xl",
      lg: "rounded-2xl",
      xl: "rounded-3xl",
    },
    elevation: {
      none: "",
      ambient: "shadow-ambient",
      raised: "shadow-raised",
      overlay: "shadow-overlay",
    },
    inset: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "panel",
    radius: "lg",
    elevation: "none",
    inset: "none",
  },
});

function Surface({ className, variant, radius, elevation, inset, render, ...props }) {
  const Comp = render ?? "div";
  return (
    <Comp
      data-slot="surface"
      className={cn(surfaceVariants({ variant, radius, elevation, inset }), className)}
      {...props}
    />
  );
}

export { Surface };
