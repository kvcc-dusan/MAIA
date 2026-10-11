import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState as ArcEmptyState } from "@/components/arc/empty-state/empty-state";
import styles from "./EmptyState.module.css";

/**
 * Empty state: says why it is empty and offers one next step (`action`).
 *
 * `icon` is a component (a Solar icon from components/icons), not an element. `size="inline"` is a
 * compact variant for in-panel cases; `size="page"` keeps Arc's roomy default.
 * Arc's empty state forwards only className and aria-label, so other DOM props
 * are not passed through.
 */
function EmptyState({ icon: Icon, title, description, action, size = "inline", className, "aria-label": label }) {
  const iconSize = size === "page" ? 24 : 20;
  return (
    <ArcEmptyState
      icon={Icon ? <Icon width={iconSize} height={iconSize} strokeWidth={1.75} /> : undefined}
      title={title}
      description={description}
      action={action}
      label={label}
      className={cn(size === "inline" && styles.inline, className)}
    />
  );
}

export { EmptyState };
