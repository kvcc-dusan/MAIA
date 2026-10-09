import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import styles from "./SectionCard.module.css";

/**
 * The Opus section card: a bordered panel with a header row and a free body.
 *
 *   header: icon slot (16px), title (SectionLabel as h3), count, action slot
 *   body:   unopinionated, size it with bodyClassName / bodyStyle
 *
 * `count` takes a number or string (wrapped in a CountPill) or an element,
 * which is rendered as given so callers can't end up with a pill in a pill.
 */
function SectionCard({
  icon: Icon,
  title,
  count,
  action,
  className,
  bodyClassName,
  bodyStyle,
  children,
  ...props
}) {
  return (
    <div className={cn(styles.card, className)} {...props}>
      <div className={styles.header}>
        <div className={styles.heading}>
          {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" className={styles.icon} /> : null}
          {title != null && <SectionLabel as="h3">{title}</SectionLabel>}
          {count != null && (React.isValidElement(count) ? count : <CountPill>{count}</CountPill>)}
        </div>
        {action}
      </div>
      <div className={bodyClassName} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

export { SectionCard };
