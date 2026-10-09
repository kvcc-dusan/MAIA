import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/arc/badge/badge";
import styles from "./StatusDot.module.css";

/**
 * Status dot. Color alone never carries status: a dot with no `label` is
 * decorative (aria-hidden) and must sit next to visible text; pass `label`
 * to get a screen-reader name for a standalone dot.
 *
 * `glow` is accepted for compatibility but ignored (Arc has no glows).
 */
// eslint-disable-next-line no-unused-vars -- glow kept in the API, see above
function StatusDot({ tone = "muted", size = "md", glow, pulse = false, label, className, ...props }) {
  const classes = cn(styles.dot, styles[tone], styles[size], pulse && styles.pulse);
  if (!label) return <span aria-hidden="true" className={cn(classes, className)} {...props} />;
  return (
    <span className={cn(styles.wrap, className)} {...props}>
      <span aria-hidden="true" className={classes} />
      <span className={styles.sr}>{label}</span>
    </span>
  );
}

const PRIORITY_LABELS = { p1: "High", p2: "Medium", p3: "Normal" };
const PRIORITY_BADGE_TONE = { p1: "danger", p2: "warning", p3: "neutral" };

/** Priority chip: Arc badge with a priority dot and the label. */
function PriorityChip({ priority = "p3", showLabel = true, className, ...props }) {
  const tone = PRIORITY_LABELS[priority] ? priority : "p3";
  if (!showLabel) {
    return <StatusDot tone={tone} size="sm" label={PRIORITY_LABELS[tone]} className={className} {...props} />;
  }
  return (
    <Badge
      tone={PRIORITY_BADGE_TONE[tone]}
      icon={<StatusDot tone={tone} size="sm" />}
      className={className}
      {...props}
    >
      {PRIORITY_LABELS[tone]}
    </Badge>
  );
}

export { StatusDot, PriorityChip };
