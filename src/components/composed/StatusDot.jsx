import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status / priority dot.
 *
 * Priority colour was defined three times (lib/utils.js, lib/constants.js and
 * inline in FocusTaskItem.jsx), each returning raw hex, and rendered via
 * `style={{ backgroundColor }}` with string-concatenated alpha for the glow.
 * One component, token-driven, so a theme change reaches all of them.
 */
const dotVariants = cva("inline-block shrink-0 rounded-full", {
  variants: {
    tone: {
      p1: "bg-priority-1",
      p2: "bg-priority-2",
      p3: "bg-priority-3",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-destructive",
      info: "bg-info",
      intel: "bg-intel",
      muted: "bg-subtle-foreground",
    },
    size: {
      sm: "size-1.5",
      md: "size-2",
      lg: "size-2.5",
    },
    glow: {
      true: "shadow-[0_0_6px_currentColor]",
      false: "",
    },
    pulse: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: { tone: "muted", size: "md", glow: false, pulse: false },
});

function StatusDot({ tone, size, glow, pulse, className, ...props }) {
  return (
    <span
      aria-hidden="true"
      className={cn(dotVariants({ tone, size, glow, pulse }), className)}
      {...props}
    />
  );
}

const PRIORITY_LABELS = { p1: "High", p2: "Medium", p3: "Normal" };

/** Priority chip — dot plus label, for rows and detail panes. */
function PriorityChip({ priority = "p3", showLabel = true, className, ...props }) {
  const tone = PRIORITY_LABELS[priority] ? priority : "p3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <StatusDot tone={tone} size="sm" />
      {showLabel && PRIORITY_LABELS[tone]}
    </span>
  );
}

export { StatusDot, PriorityChip };
